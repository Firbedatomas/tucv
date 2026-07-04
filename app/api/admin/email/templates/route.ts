import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const admin = await pbAdmin();
  const list = await admin.collection("email_templates").getFullList({ sort: "name", requestKey: null });
  return NextResponse.json({ items: list });
}

export async function POST(req: Request) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const name = body?.name as string | undefined;
  const subject = body?.subject as string | undefined;
  const bodyHtml = body?.bodyHtml as string | undefined;
  const section = (body?.section as string | undefined) || "";
  if (!name?.trim() || !subject?.trim() || !bodyHtml?.trim()) {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }

  const admin = await pbAdmin();
  const record = await admin.collection("email_templates").create({
    name: name.trim(),
    section: section.trim(),
    subject: subject.trim(),
    body_html: bodyHtml,
  });
  return NextResponse.json({ item: record });
}
