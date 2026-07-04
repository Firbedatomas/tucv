import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";

export type SuppressionReason = "bounced" | "complained" | "manual";

export async function isSuppressed(email: string): Promise<boolean> {
  const admin = await pbAdmin();
  const normalized = email.trim().toLowerCase();
  const existing = await admin
    .collection("email_suppressions")
    .getFirstListItem(admin.filter("email = {:email}", { email: normalized }))
    .catch(() => null);
  return Boolean(existing);
}

export async function suppress(email: string, reason: SuppressionReason, detail?: string): Promise<void> {
  const admin = await pbAdmin();
  const normalized = email.trim().toLowerCase();
  const existing = await admin
    .collection("email_suppressions")
    .getFirstListItem(admin.filter("email = {:email}", { email: normalized }))
    .catch(() => null);
  if (existing) return;
  await admin.collection("email_suppressions").create({ email: normalized, reason, detail: detail || "" });
}
