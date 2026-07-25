import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildSourcedInterestOutreachEmail } from "@/lib/email/templates/sourced-interest-outreach";
import { generarTokenBaja } from "@/lib/sourced-optout";
import { notifyTelegram } from "@/lib/telegram";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

export const dynamic = "force-dynamic";

// Tope por corrida. Bajo a propósito: es el único mail que TuCV le manda a
// alguien que no se registró, y la reputación de envío del dominio la comparte
// con los mails transaccionales que HOY funcionan (avisos de postulación,
// vencimientos). Si esto genera quejas de spam, se lleva puesto eso también.
const MAX_POR_CORRIDA = 25;

// Nunca se le escribe dos veces en menos de esto al mismo negocio.
const DIAS_ENTRE_ENVIOS = 30;

/**
 * Aviso semanal a empresas detectadas con candidatos interesados.
 *
 * Tres condiciones, todas necesarias:
 *   1. Tiene email cargado.
 *   2. Tiene al menos UN candidato interesado. Sin esto sería publicidad fría;
 *      con esto es información concreta sobre su propio negocio.
 *   3. Sigue en "detected" (no se dio de baja ni la reclamó).
 *
 * `?dry=1` devuelve a quién se le escribiría sin mandar nada.
 */
export async function POST(req: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!process.env.SOURCED_OPTOUT_SECRET) {
    // Sin secreto no se puede firmar el link de baja. Preferimos no mandar
    // nada antes que mandar un mail cuya baja no funciona.
    return NextResponse.json({ ok: false, error: "SOURCED_OPTOUT_SECRET no configurado" }, { status: 503 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";

  const admin = await pbAdmin();

  // El envío depende de poder anotar a quién se le escribió: sin eso, el
  // filtro de "no escribirle dos veces en 30 días" no tiene contra qué
  // comparar y le mandaría el mismo mail a la misma empresa todas las semanas.
  // Ese registro lo habilita scripts/pb-migrate-sourced-outreach.mjs
  // (last_outreach_at en sourced_businesses). Si el campo no está, no se manda.
  if (!dry) {
    const soporta = await admin
      .collection("sourced_businesses")
      .getList(1, 1, { fields: "id,last_outreach_at", requestKey: null })
      .then(() => true)
      .catch(() => false);
    if (!soporta) {
      return NextResponse.json(
        { ok: false, error: "falta la migración: node scripts/pb-migrate-sourced-outreach.mjs" },
        { status: 503 },
      );
    }
  }

  const [negocios, jobs, intereses] = await Promise.all([
    admin.collection("sourced_businesses").getFullList<{
      id: string;
      name: string;
      status?: string;
      contact_email?: string;
      city_zone?: string;
      claimed_business?: string;
      public_slug?: string;
      last_outreach_at?: string;
    }>({ requestKey: null }),
    admin.collection("sourced_jobs").getFullList<{ id: string; sourced_business: string }>({
      fields: "id,sourced_business",
      requestKey: null,
    }),
    admin.collection("candidate_interest").getFullList<{ sourced_job: string }>({
      fields: "sourced_job",
      requestKey: null,
    }),
  ]);

  const negocioDeJob = new Map(jobs.map((j) => [j.id, j.sourced_business]));
  const interesPorNegocio = new Map<string, number>();
  for (const i of intereses) {
    const b = negocioDeJob.get(i.sourced_job);
    if (b) interesPorNegocio.set(b, (interesPorNegocio.get(b) ?? 0) + 1);
  }

  const corte = new Date(Date.now() - DIAS_ENTRE_ENVIOS * 86400000).toISOString();
  const candidatos = negocios
    .filter((n) => (n.status ?? "detected") === "detected")
    .filter((n) => !n.claimed_business)
    .filter((n) => (n.contact_email ?? "").includes("@"))
    .filter((n) => (interesPorNegocio.get(n.id) ?? 0) > 0)
    .filter((n) => !n.last_outreach_at || n.last_outreach_at < corte)
    .sort((a, b) => (interesPorNegocio.get(b.id) ?? 0) - (interesPorNegocio.get(a.id) ?? 0))
    .slice(0, MAX_POR_CORRIDA);

  if (dry) {
    return NextResponse.json({
      ok: true,
      dry: true,
      elegibles: candidatos.length,
      detalle: candidatos.map((n) => ({ nombre: n.name, interesados: interesPorNegocio.get(n.id) ?? 0 })),
    });
  }

  let enviados = 0;
  const errores: string[] = [];
  for (const n of candidatos) {
    const interested = interesPorNegocio.get(n.id) ?? 0;
    const rendered = buildSourcedInterestOutreachEmail({
      businessName: n.name,
      interested,
      cityZone: n.city_zone ?? "",
      claimUrl: `${BASE_URL}/e/${n.public_slug}/reclamar`,
      optOutUrl: `${BASE_URL}/api/sourced-optout/${generarTokenBaja(n.id)}`,
    });

    const r = await sendTransactionalEmail({
      type: "sourced_interest_outreach",
      to: n.contact_email as string,
      rendered,
      unsubscribeUrl: `${BASE_URL}/api/sourced-optout/${generarTokenBaja(n.id)}`,
      metadata: { sourcedBusiness: n.id, interested },
    }).catch(() => null);

    if (r) {
      enviados += 1;
      // Se marca aunque el envío haya quedado encolado: lo que importa es no
      // volver a escribirle antes de tiempo.
      await admin
        .collection("sourced_businesses")
        .update(n.id, { last_outreach_at: new Date().toISOString() })
        .catch(() => null);
    } else {
      errores.push(n.name);
    }
  }

  if (enviados > 0) {
    await notifyTelegram(`TuCV · outreach a empresas detectadas: ${enviados} mail(s) enviado(s).`);
  }
  return NextResponse.json({ ok: true, elegibles: candidatos.length, enviados, errores });
}
