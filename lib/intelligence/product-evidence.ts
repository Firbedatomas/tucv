import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getGoalCounts, isPlausibleConfigured } from "@/lib/admin/plausible";
import { computeCandidateBreakdown, CANDIDATE_BREAKDOWN_FIELDS, type CandidateBreakdownInput } from "@/lib/candidate-stats";
import type { Evidencia } from "@/lib/intelligence/product-signals";

// Recolección de evidencia para el loop de producto.
//
// Separado del detector (product-signals.ts) a propósito: la lectura no cambia,
// las reglas que la interpretan sí evolucionan. Mezclarlas acopla dos cosas que
// tienen que poder cambiar por separado -- y además haría al detector
// imposible de testear sin base de datos.
//
// Todo lo que se lee acá YA existía (PocketBase + Plausible + los mismos
// helpers que alimentan /admin). No se creó ninguna fuente nueva: dos fuentes
// de la misma verdad divergen con el tiempo y nadie se entera.

const DIAS_PARA_ACTIVAR = 7;
const DIAS_PARA_VOLVER = 30;

// Mismos objetivos que ya mide /admin/embudo -- si se agrega uno allá, sumarlo
// acá también.
const OBJETIVOS = [
  "recruiter_panel",
  "recruiter_abrir_perfil",
  "recruiter_marcar_visto",
  "recruiter_guardar",
  "recruiter_contactar",
  "sourced_ver",
  "sourced_me_interesa",
  "sourced_reclamar_ver",
  "sourced_reclamar_login",
  "sourced_reclamar_ok",
];

export async function recolectarEvidencia(ahora = new Date()): Promise<Evidencia> {
  const admin = await pbAdmin();
  const haceUnaSemana = new Date(ahora.getTime() - DIAS_PARA_ACTIVAR * 86400000).toISOString();
  const haceUnMes = new Date(ahora.getTime() - DIAS_PARA_VOLVER * 86400000).toISOString();
  const ahoraISO = ahora.toISOString();

  const [negocios, jobs, candidatos, activas, sembrados, sembradosJobs, intereses] = await Promise.all([
    admin.collection("business_accounts").getFullList<{ id: string; created: string; plan?: string }>({
      fields: "id,created,plan",
      requestKey: null,
    }),
    // Todas las búsquedas con su negocio y fecha: alcanza para derivar
    // activación, retención y vencimientos sin pegarle N veces a la base.
    admin.collection("job_posts").getFullList<{ id: string; business: string; created: string; expires_at?: string }>({
      fields: "id,business,created,expires_at",
      requestKey: null,
    }),
    admin.collection("candidate_profiles").getFullList<CandidateBreakdownInput>({
      fields: CANDIDATE_BREAKDOWN_FIELDS,
      requestKey: null,
    }),
    admin.collection("job_posts").getList(1, 1, {
      filter: admin.filter("active = true && expires_at > {:now}", { now: ahoraISO }),
      requestKey: null,
    }),
    admin.collection("sourced_businesses").getFullList<{ id: string; status?: string }>({
      fields: "id,status",
      requestKey: null,
    }),
    admin.collection("sourced_jobs").getFullList<{ id: string; sourced_business: string }>({
      fields: "id,sourced_business",
      requestKey: null,
    }),
    admin.collection("candidate_interest").getFullList<{ sourced_job: string }>({
      fields: "sourced_job",
      requestKey: null,
    }),
  ]);

  // Captación: qué negocios sembrados tienen interés real y cuántos se
  // contactaron. El interés cuelga de sourced_jobs, no del negocio, así que
  // hay que resolver el salto.
  const negocioDeJob = new Map(sembradosJobs.map((j) => [j.id, j.sourced_business]));
  const sembradosConInteres = new Set<string>();
  for (const i of intereses) {
    const b = negocioDeJob.get(i.sourced_job);
    if (b) sembradosConInteres.add(b);
  }
  // "detected" es el estado inicial del cron de captación: todo lo que salió
  // de ahí es que alguien lo tocó.
  const contactados = sembrados.filter((b) => b.status && b.status !== "detected").length;

  // Búsquedas por negocio, para activación y retención.
  const porNegocio = new Map<string, { total: number; ultima: string }>();
  for (const j of jobs) {
    const prev = porNegocio.get(j.business);
    if (prev) {
      prev.total += 1;
      if (j.created > prev.ultima) prev.ultima = j.created;
    } else {
      porNegocio.set(j.business, { total: 1, ultima: j.created });
    }
  }

  let sinPublicarNunca = 0;
  let unaSolaVezYNoVolvieron = 0;
  let enPlanPago = 0;
  for (const n of negocios) {
    if (n.plan && n.plan !== "free") enPlanPago += 1;
    const stats = porNegocio.get(n.id);
    // Solo cuenta como "no activó" si tuvo tiempo de hacerlo: un negocio que
    // se registró ayer todavía no abandonó nada.
    if (!stats) {
      if (n.created <= haceUnaSemana) sinPublicarNunca += 1;
      continue;
    }
    if (stats.total === 1 && stats.ultima <= haceUnMes) unaSolaVezYNoVolvieron += 1;
  }

  // Vencidas en los últimos 30 días, y cuántas de esas no recibieron nada.
  const vencidas = jobs.filter((j) => j.expires_at && j.expires_at <= ahoraISO && j.expires_at >= haceUnMes);
  let vencidasSinPostulaciones = 0;
  if (vencidas.length > 0) {
    // Una sola consulta y contamos en memoria, en vez de una por búsqueda.
    const postulaciones = await admin.collection("applications").getFullList<{ job_post: string }>({
      fields: "job_post",
      requestKey: null,
    });
    const conPostulacion = new Set(postulaciones.map((p) => p.job_post));
    vencidasSinPostulaciones = vencidas.filter((j) => !conPostulacion.has(j.id)).length;
  }

  const breakdown = computeCandidateBreakdown(candidatos);

  let objetivos: Record<string, number> | null = null;
  if (isPlausibleConfigured()) {
    try {
      const counts = await getGoalCounts(OBJETIVOS, "30d");
      if (counts) {
        objetivos = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v.visitors]));
      }
    } catch {
      // Plausible caído no invalida el resto de la evidencia.
      objetivos = null;
    }
  }

  return {
    negocios: {
      total: negocios.length,
      sinPublicarNunca,
      unaSolaVezYNoVolvieron,
      enPlanPago,
    },
    busquedas: {
      activas: activas.totalItems,
      vencidasRecientes: vencidas.length,
      vencidasSinPostulaciones,
    },
    postulantes: {
      total: breakdown.total,
      incompletos: breakdown.incompletos,
    },
    captacion: {
      sembrados: sembrados.length,
      conInteres: sembradosConInteres.size,
      contactados,
    },
    objetivos,
  };
}
