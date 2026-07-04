import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

const VALID_COLLECTIONS = new Set(["profile_reports", "business_reports"]);

// "Descartar" un reporte es simplemente borrarlo -- no hay ningún estado de
// "revisado" que trackear todavía (moderación básica: alguien lo lee, actúa
// a mano si corresponde -- suspender el perfil/negocio desde el admin de
// PocketBase -- y lo saca de la lista).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const collection = new URL(req.url).searchParams.get("collection");
  if (!collection || !VALID_COLLECTIONS.has(collection)) {
    return NextResponse.json({ error: "colección inválida" }, { status: 400 });
  }

  const admin = await pbAdmin();
  await admin.collection(collection).delete(id).catch(() => null);
  return NextResponse.json({ ok: true });
}
