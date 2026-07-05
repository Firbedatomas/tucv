import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveUserIdFromToken } from "@/lib/candidate-session";

// El candidato bloquea / desbloquea a una empresa. Bloquear impide que esa
// empresa le envíe nuevas solicitudes de contacto. Escritura solo por API.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const businessId = typeof body.businessId === "string" ? body.businessId : "";
  const action = body.action === "unblock" ? "unblock" : body.action === "block" ? "block" : "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!businessId || !action) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });

  const userId = await resolveUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const admin = await pbAdmin();
    const candidate = await admin
      .collection("candidate_profiles")
      .getFirstListItem(admin.filter("user = {:u}", { u: userId }))
      .catch(() => null);
    if (!candidate) return NextResponse.json({ error: "unauthorized" }, { status: 403 });

    const existing = await admin
      .collection("blocks")
      .getFirstListItem(admin.filter("candidate = {:c} && business = {:b}", { c: candidate.id, b: businessId }))
      .catch(() => null);

    if (action === "block") {
      if (!existing) {
        await admin.collection("blocks").create({ candidate: candidate.id, business: businessId });
      }
      return NextResponse.json({ ok: true, blocked: true });
    }

    // unblock
    if (existing) await admin.collection("blocks").delete(existing.id);
    return NextResponse.json({ ok: true, blocked: false });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar." }, { status: 500 });
  }
}
