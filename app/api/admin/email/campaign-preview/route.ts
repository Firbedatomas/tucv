import "server-only";
import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";
import { renderCampaignEmail } from "@/lib/email/campaign";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

// Renderiza el email de una campaña tal cual saldría (con un nombre de ejemplo)
// para previsualizarlo antes de mandar. Devuelve el HTML. Solo admin.
export async function POST(req: Request) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const subject = ((body?.subject as string) || "").slice(0, 200);
  const bodyText = ((body?.body as string) || "").slice(0, 4000);
  const name = ((body?.name as string) || "Tomás").slice(0, 40);
  const ctaHref = typeof body?.ctaHref === "string" && body.ctaHref.startsWith("/") ? `${BASE}${body.ctaHref}` : undefined;
  const ctaLabel = ctaHref && typeof body?.ctaLabel === "string" ? body.ctaLabel.slice(0, 40) : undefined;

  const rendered = renderCampaignEmail(subject, bodyText, name, `${BASE}/api/email/unsubscribe?token=ejemplo`, {
    label: ctaLabel,
    href: ctaHref,
  });
  return new NextResponse(rendered.html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
