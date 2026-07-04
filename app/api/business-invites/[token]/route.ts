import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";

// Pública (sin sesión) a propósito -- la página de invitación necesita
// mostrar el nombre del negocio ANTES de que la persona inicie sesión con
// Google. Nunca devuelve el email de la invitación ni ids internos más allá
// de lo que la UI necesita, mismo criterio que
// getPreferencesByUnsubscribeToken (lib/email/preferences.ts).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = await pbAdmin();

  const invite = await admin
    .collection("business_invites")
    .getFirstListItem(admin.filter("token = {:token}", { token }))
    .catch(() => null);
  if (!invite) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (invite.status !== "pending") return NextResponse.json({ error: "already_used" }, { status: 410 });
  if (new Date(invite.expires as string).getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const business = await admin.collection("business_accounts").getOne(invite.business as string).catch(() => null);
  if (!business) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    businessName: business.business_name,
    logoUrl: business.logo ? admin.files.getURL(business, business.logo as string) : null,
  });
}
