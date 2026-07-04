import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import {
  computeCandidateBreakdown,
  CANDIDATE_BREAKDOWN_FIELDS,
  type CandidateBreakdownInput,
} from "@/lib/candidate-stats";

// Argentina no tiene horario de verano hace años -> UTC-3 fijo alcanza para
// calcular "hoy" sin depender de la timezone del contenedor (que corre en
// UTC) ni sumar una librería de fechas.
function startOfTodayArgentinaISO(): string {
  const now = new Date();
  const arNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(arNow.getUTCFullYear(), arNow.getUTCMonth(), arNow.getUTCDate(), 3, 0, 0)
  ).toISOString();
}

export type DashboardStats = {
  negocios: { total: number; hoy: number };
  postulantes: {
    total: number;
    hoy: number;
    visiblesEmpresas: number;
    perfilPublico: number;
    incompletos: number;
    ocultos: number;
  };
  postulaciones: { total: number; hoy: number };
  avisosActivos: number;
  pagos: {
    totalAprobado: number;
    hoyAprobado: number;
    cantidadHoy: number;
    porTipo: Record<string, number>;
  };
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const admin = await pbAdmin();
  const todayISO = startOfTodayArgentinaISO();
  const nowISO = new Date().toISOString();
  const todayFilter = admin.filter("created >= {:today}", { today: todayISO });

  const [
    businessesTotal,
    businessesToday,
    candidates,
    applicationsTotal,
    applicationsToday,
    activeJobs,
    approvedPayments,
  ] = await Promise.all([
    admin.collection("business_accounts").getList(1, 1, { requestKey: null }),
    admin.collection("business_accounts").getList(1, 1, { filter: todayFilter, requestKey: null }),
    admin.collection("candidate_profiles").getFullList<CandidateBreakdownInput & { created: string }>({
      fields: CANDIDATE_BREAKDOWN_FIELDS,
      requestKey: null,
    }),
    admin.collection("applications").getList(1, 1, { requestKey: null }),
    admin.collection("applications").getList(1, 1, { filter: todayFilter, requestKey: null }),
    admin.collection("job_posts").getList(1, 1, {
      filter: admin.filter("active = true && expires_at > {:now}", { now: nowISO }),
      requestKey: null,
    }),
    admin.collection("payments").getFullList<{ amount: number; type: string; created: string }>({
      filter: "status = 'approved'",
      fields: "amount,type,created",
      requestKey: null,
    }),
  ]);

  const candidateBreakdown = computeCandidateBreakdown(candidates);
  const candidatesToday = candidates.filter((c) => c.created >= todayISO).length;
  const paymentsToday = approvedPayments.filter((p) => p.created >= todayISO);
  const porTipo: Record<string, number> = {};
  for (const p of approvedPayments) {
    porTipo[p.type] = (porTipo[p.type] ?? 0) + (p.amount ?? 0);
  }

  return {
    negocios: { total: businessesTotal.totalItems, hoy: businessesToday.totalItems },
    postulantes: {
      total: candidateBreakdown.total,
      hoy: candidatesToday,
      visiblesEmpresas: candidateBreakdown.visiblesEmpresas,
      perfilPublico: candidateBreakdown.perfilPublico,
      incompletos: candidateBreakdown.incompletos,
      ocultos: candidateBreakdown.ocultos,
    },
    postulaciones: { total: applicationsTotal.totalItems, hoy: applicationsToday.totalItems },
    avisosActivos: activeJobs.totalItems,
    pagos: {
      totalAprobado: approvedPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0),
      hoyAprobado: paymentsToday.reduce((sum, p) => sum + (p.amount ?? 0), 0),
      cantidadHoy: paymentsToday.length,
      porTipo,
    },
  };
}
