import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const admin = await pbAdmin();
  const result = await admin
    .collection("email_threads")
    .getList(1, 1, { filter: "unread = true", requestKey: null })
    .catch(() => null);

  return NextResponse.json({ count: result?.totalItems ?? 0 });
}
