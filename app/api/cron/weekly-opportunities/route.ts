import "server-only";
import { NextResponse } from "next/server";
import { runCampaign } from "@/lib/email/campaign";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

// Email SEMANAL a candidatos con avisos de oportunidades activados (Opción B):
// "nuevas empresas de tu zona esta semana". Respeta baja + supresión (runCampaign),
// se encola y lo drena el flush horario. Cada semana entran ~350 PYMES nuevas por
// el cron de captación, así que siempre hay novedad real.
export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await runCampaign({
    audience: "candidates",
    subject: "Nuevas oportunidades cerca tuyo esta semana",
    body:
      "Hola {nombre},\n\n" +
      "Sumamos nuevas empresas de tu zona abiertas a sumar gente. Mirá cuáles hay cerca tuyo y marcá " +
      '"me interesa" en las que te gusten — cuando entren a TuCV, te contactan directo.\n\n' +
      "Es gratis y te lleva un minuto.",
    ctaLabel: "Ver oportunidades cerca mío",
    ctaHref: `${BASE}/oportunidades`,
    dryRun: false,
  });
  return NextResponse.json({ ok: true, ...result });
}
