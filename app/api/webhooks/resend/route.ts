import { NextResponse } from "next/server";
import "server-only";
import { Webhook } from "svix";
import { updateEmailEventStatusByProviderMessageId } from "@/lib/email/log";
import { suppress } from "@/lib/email/suppression";
import type { EmailStatus } from "@/lib/email/types";

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;

const STATUS_BY_EVENT: Record<string, EmailStatus> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

// Resend firma sus webhooks con Svix (svix-id/svix-timestamp/svix-signature)
// -- sin verificar, cualquiera podría pegarle a esta URL para marcar
// direcciones como "delivered"/manipular email_events. Igual que el webhook
// de Mercado Pago, siempre devolvemos 200 salvo que la firma sea inválida
// (ahí sí rechazamos, no hay nada legítimo que reintentar).
export async function POST(req: Request) {
  if (!RESEND_WEBHOOK_SECRET) return NextResponse.json({ ok: true });

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") || "",
    "svix-timestamp": req.headers.get("svix-timestamp") || "",
    "svix-signature": req.headers.get("svix-signature") || "",
  };

  let event: { type: string; data: { email_id?: string; to?: string[]; bounce?: { message?: string } } };
  try {
    const wh = new Webhook(RESEND_WEBHOOK_SECRET);
    event = wh.verify(payload, headers) as typeof event;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  try {
    const status = STATUS_BY_EVENT[event.type];
    const messageId = event.data.email_id;
    if (status && messageId) {
      await updateEmailEventStatusByProviderMessageId(messageId, status, {
        error: event.data.bounce?.message,
      });
    }

    if (event.type === "email.bounced" && event.data.to?.[0]) {
      await suppress(event.data.to[0], "bounced", event.data.bounce?.message);
    }
    if (event.type === "email.complained" && event.data.to?.[0]) {
      await suppress(event.data.to[0], "complained");
    }
  } catch {
    // No dejamos que un error nuestro (ej. PocketBase caído un instante)
    // haga que Resend reintente infinito -- el próximo evento de este mismo
    // email (delivered/opened, etc.) va a volver a intentar actualizarlo.
  }

  return NextResponse.json({ ok: true });
}
