import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import type { EmailType, RenderedEmail } from "@/lib/email/types";

export type QueuedEmail = {
  id: string;
  type: EmailType;
  userId?: string;
  to: string;
  rendered: RenderedEmail;
  unsubscribeUrl?: string;
};

export async function enqueueEmail(params: {
  type: EmailType;
  to: string;
  userId?: string;
  rendered: RenderedEmail;
  unsubscribeUrl?: string;
  scheduledFor: Date;
}): Promise<void> {
  const admin = await pbAdmin();
  await admin.collection("email_queue").create({
    type: params.type,
    user: params.userId || null,
    to: params.to,
    subject: params.rendered.subject,
    html: params.rendered.html,
    text_body: params.rendered.text,
    unsubscribe_url: params.unsubscribeUrl || "",
    scheduled_for: params.scheduledFor.toISOString(),
  });
}

// Emails cuyo scheduled_for ya pasó -- los que el flush tiene que mandar.
export async function listDueEmails(now: Date, limit = 200): Promise<QueuedEmail[]> {
  const admin = await pbAdmin();
  const items = await admin.collection("email_queue").getList(1, limit, {
    filter: admin.filter("scheduled_for <= {:now}", { now: now.toISOString() }),
    sort: "scheduled_for",
    requestKey: null,
  });
  return items.items.map((r) => ({
    id: r.id,
    type: r.type as EmailType,
    userId: (r.user as string) || undefined,
    to: r.to as string,
    rendered: { subject: r.subject as string, html: r.html as string, text: (r.text_body as string) || "" },
    unsubscribeUrl: (r.unsubscribe_url as string) || undefined,
  }));
}

export async function removeFromQueue(id: string): Promise<void> {
  const admin = await pbAdmin();
  await admin.collection("email_queue").delete(id).catch(() => null);
}
