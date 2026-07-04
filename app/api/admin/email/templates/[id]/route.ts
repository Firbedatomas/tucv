import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const data: Record<string, string> = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.section === "string") data.section = body.section.trim();
  if (typeof body?.subject === "string") data.subject = body.subject.trim();
  if (typeof body?.bodyHtml === "string") data.body_html = body.bodyHtml;

  const admin = await pbAdmin();
  const record = await admin.collection("email_templates").update(id, data).catch(() => null);
  if (!record) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  return NextResponse.json({ item: record });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const admin = await pbAdmin();
  await admin.collection("email_templates").delete(id).catch(() => null);
  return NextResponse.json({ ok: true });
}
