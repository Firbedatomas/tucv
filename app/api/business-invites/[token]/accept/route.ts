import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const pbToken = body.pbToken ?? null;
  if (!pbToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Mismo patrón de "validar token de sesión contra PocketBase" que
  // mercadopago/checkout -- acá además necesitamos el EMAIL autenticado
  // (no solo el id), para compararlo contra el de la invitación.
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(pbToken, null);
  let userId: string;
  let userEmail: string;
  try {
    await client.collection("users").authRefresh();
    userId = client.authStore.record?.id as string;
    userEmail = (client.authStore.record?.email as string) ?? "";
    if (!userId || !userEmail) throw new Error("no-user");
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = await pbAdmin();

    const invite = await admin
      .collection("business_invites")
      .getFirstListItem(admin.filter("token = {:token}", { token }))
      .catch(() => null);
    if (!invite) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (invite.status !== "pending" || new Date(invite.expires as string).getTime() < Date.now()) {
      return NextResponse.json({ error: "expired_or_used" }, { status: 410 });
    }

    if ((invite.email as string).toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json({ error: "email_mismatch", invitedEmail: invite.email }, { status: 403 });
    }

    // Invariante V1: un usuario tiene como máximo una relación con un
    // negocio (dueño de uno, o miembro de otro) -- ver lib/business-access.ts.
    // Chequeo acá antes de crear nada; los hooks de pb_hooks/main.pb.js
    // repiten esta misma validación server-side como defensa en profundidad.
    const [alreadyOwner, alreadyMember] = await Promise.all([
      admin.collection("business_accounts").getFirstListItem(`user="${userId}"`).catch(() => null),
      admin.collection("business_members").getFirstListItem(`user="${userId}"`).catch(() => null),
    ]);
    if (alreadyOwner || alreadyMember) {
      return NextResponse.json({ error: "already_has_business" }, { status: 409 });
    }

    await admin.collection("business_members").create({ business: invite.business, user: userId });
    await admin.collection("business_invites").update(invite.id, { status: "accepted" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No pudimos aceptar la invitación. Probá de nuevo." }, { status: 500 });
  }
}
