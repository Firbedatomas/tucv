import "server-only";
import { NextResponse } from "next/server";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";
import { pbAdmin } from "@/lib/pocketbase-admin";

const STATUSES = ["detected", "contacted", "claimed", "opted_out"];

// Actualiza (estado/notas) o borra una empresa detectada. Solo admin.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  if (!/^[a-z0-9]{15}$/.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = {};
  if (typeof body?.status === "string" && STATUSES.includes(body.status)) patch.status = body.status;
  if (typeof body?.notes === "string") patch.notes = body.notes.slice(0, 1000);
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Nada para actualizar." }, { status: 400 });

  const admin = await pbAdmin();
  const updated = await admin.collection("sourced_businesses").update(id, patch).catch(() => null);
  if (!updated) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;
  const { id } = await params;
  if (!/^[a-z0-9]{15}$/.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const admin = await pbAdmin();
  await admin.collection("sourced_businesses").delete(id).catch(() => null); // cascade borra sus búsquedas
  return NextResponse.json({ ok: true });
}
