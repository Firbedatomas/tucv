import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

const VALID_PLANS = new Set(["free", "pro", "multi_local"]);

// PATCH cambia plan/verified/suspended a mano -- pasa por pbAdmin() (sesión
// de superusuario) a propósito: el hook onRecordUpdateRequest de
// business_accounts (pocketbase/pb_hooks/main.pb.js) revierte cualquier
// cambio de `plan` que no venga de un superusuario, así que un cliente
// normal (aunque fuera admin) nunca podría hacer este cambio directo.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (body.plan !== undefined) {
    if (!VALID_PLANS.has(body.plan)) return NextResponse.json({ error: "plan inválido" }, { status: 400 });
    patch.plan = body.plan;
  }
  if (typeof body.verified === "boolean") patch.verified = body.verified;
  if (typeof body.suspended === "boolean") patch.suspended = body.suspended;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nada para actualizar" }, { status: 400 });
  }

  const admin = await pbAdmin();
  const record = await admin.collection("business_accounts").update(id, patch).catch(() => null);
  if (!record) return NextResponse.json({ error: "no encontrado" }, { status: 404 });

  return NextResponse.json({ ok: true });
}

// Borrado real -- cascadea a job_posts (y de ahí a applications, que
// cascadea desde job_post) y a business_members/business_invites. Los
// `payments` NO cascadean (cascadeDelete: false a propósito, ver
// 1783159999_created_payments.js) -- el historial de pagos se conserva por
// motivos contables aunque el negocio se borre.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const admin = await pbAdmin();
  await admin.collection("business_accounts").delete(id).catch(() => null);
  return NextResponse.json({ ok: true });
}
