import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const admin = await pbAdmin();

  await admin.collection("email_threads").update(id, { unread: false }).catch(() => null);

  const now = new Date().toISOString();
  const unreadMessages = await admin
    .collection("email_messages")
    .getFullList({
      filter: admin.filter("thread = {:id} && direction = 'in' && read_at = ''", { id }),
      requestKey: null,
    })
    .catch(() => []);
  await Promise.all(
    unreadMessages.map((m) => admin.collection("email_messages").update(m.id, { read_at: now }).catch(() => null))
  );

  return NextResponse.json({ ok: true });
}
