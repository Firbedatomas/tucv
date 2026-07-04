import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

// Suspender un postulante lo saca de public_candidate_cards (ver el hook de
// sincronización en pocketbase/pb_hooks/main.pb.js, que ahora chequea
// `suspended`) sin borrar el perfil -- reversible.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.suspended !== "boolean") {
    return NextResponse.json({ error: "falta suspended" }, { status: 400 });
  }

  const admin = await pbAdmin();
  // update() dispara los hooks onRecordUpdate/onRecordAfterUpdateSuccess de
  // candidate_profiles igual que si lo hubiera editado la propia persona --
  // así el espejo público se sincroniza solo, sin lógica duplicada acá.
  const record = await admin.collection("candidate_profiles").update(id, { suspended: body.suspended }).catch(() => null);
  if (!record) return NextResponse.json({ error: "no encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

// Borrado real -- cascadea a applications (via candidate) y a
// public_candidate_cards (cascadeDelete en su relación `candidate`).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const admin = await pbAdmin();
  await admin.collection("candidate_profiles").delete(id).catch(() => null);
  return NextResponse.json({ ok: true });
}
