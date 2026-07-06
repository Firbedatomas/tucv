import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import type { EmailStatus, EmailType } from "@/lib/email/types";

export async function logEmailEvent(input: {
  userId?: string;
  email: string;
  type: EmailType;
  status: EmailStatus;
  providerMessageId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  // Best-effort: registrar el evento NUNCA debe romper el envío. Si el create
  // tira (ej. un `type` que todavía no está en el select de email_events), antes
  // se propagaba y hacía 500 el flush de la cola -> el email quedaba encolado y
  // se reenviaba (duplicado real, visto con el tipo "campaign"). Ahora se traga
  // el error y se loguea, así el envío se completa y la cola se limpia igual.
  try {
    const admin = await pbAdmin();
    await admin.collection("email_events").create({
      user: input.userId || null,
      email: input.email,
      type: input.type,
      status: input.status,
      provider_message_id: input.providerMessageId || "",
      error: input.error || "",
      metadata: input.metadata || {},
    });
  } catch (err) {
    console.error(
      `[logEmailEvent] no se pudo registrar (${input.type}/${input.status}):`,
      err instanceof Error ? err.message : err,
    );
  }
}

export async function updateEmailEventStatusByProviderMessageId(
  providerMessageId: string,
  status: EmailStatus,
  extra?: { error?: string },
): Promise<void> {
  const admin = await pbAdmin();
  const event = await admin
    .collection("email_events")
    .getFirstListItem(admin.filter("provider_message_id = {:id}", { id: providerMessageId }))
    .catch(() => null);
  if (!event) return;
  await admin.collection("email_events").update(event.id, {
    status,
    error: extra?.error ?? event.error,
  });
}
