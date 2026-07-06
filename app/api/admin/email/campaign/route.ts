import "server-only";
import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";
import { runCampaign, type CampaignAudience } from "@/lib/email/campaign";

// Envío masivo (campaña) desde /admin/correo/campanas. dryRun=true solo cuenta
// destinatarios (previsualización). El envío real ENCOLA -> el cron flush lo
// manda con rate-limit y reintentos. Respeta baja de marketing + supresión.
export async function POST(req: Request) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const audience = body?.audience as CampaignAudience;
  const subject = ((body?.subject as string) || "").trim();
  const bodyText = ((body?.body as string) || "").trim();
  const dryRun = Boolean(body?.dryRun);

  if (audience !== "candidates" && audience !== "businesses") {
    return NextResponse.json({ error: "Audiencia inválida." }, { status: 400 });
  }
  if (!dryRun && (!subject || !bodyText)) {
    return NextResponse.json({ error: "Falta el asunto o el cuerpo." }, { status: 400 });
  }

  // CTA opcional: solo aceptamos un href interno (path de tucv.ar) para no meter
  // links externos en un email masivo.
  const ctaHref = typeof body?.ctaHref === "string" && body.ctaHref.startsWith("/") ? body.ctaHref : undefined;
  const ctaLabel = ctaHref && typeof body?.ctaLabel === "string" ? body.ctaLabel.slice(0, 40) : undefined;

  const result = await runCampaign({
    audience,
    rubro: (body?.rubro as string) || undefined,
    zona: (body?.zona as string) || undefined,
    subject,
    body: bodyText,
    ctaLabel,
    ctaHref: ctaHref ? `${process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar"}${ctaHref}` : undefined,
    dryRun,
  });
  return NextResponse.json({ ok: true, ...result });
}
