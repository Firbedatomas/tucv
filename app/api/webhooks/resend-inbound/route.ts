import { NextResponse } from "next/server";
import "server-only";
import { Webhook } from "svix";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { sectionFromAddress, parseFromHeader } from "@/lib/admin/email";
import { sanitizeInboundEmailHtml } from "@/lib/admin/sanitize-email";

const RESEND_INBOUND_WEBHOOK_SECRET = process.env.RESEND_INBOUND_WEBHOOK_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

type ReceivedEmailEvent = {
  type: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
  };
};

// El webhook de Resend solo manda metadata (from/to/subject/attachments) --
// el cuerpo (html/text) hay que pedirlo aparte a la Receiving API con el
// email_id. Ver lib/email/client.ts para el webhook de ESTADOS de envío
// (sent/delivered/bounced), que es un endpoint y un secreto distintos.
async function fetchFullEmail(emailId: string): Promise<{ html: string; text: string }> {
  if (!RESEND_API_KEY) return { html: "", text: "" };
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
    });
    if (!res.ok) return { html: "", text: "" };
    const data = await res.json();
    return { html: data.html || "", text: data.text || "" };
  } catch {
    return { html: "", text: "" };
  }
}

export async function POST(req: Request) {
  if (!RESEND_INBOUND_WEBHOOK_SECRET) return NextResponse.json({ ok: true });

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") || "",
    "svix-timestamp": req.headers.get("svix-timestamp") || "",
    "svix-signature": req.headers.get("svix-signature") || "",
  };

  let event: ReceivedEmailEvent;
  try {
    const wh = new Webhook(RESEND_INBOUND_WEBHOOK_SECRET);
    event = wh.verify(payload, headers) as ReceivedEmailEvent;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  if (event.type !== "email.received") return NextResponse.json({ ok: true });

  try {
    const emailId = event.data.email_id;
    const toList = event.data.to ?? [];
    const subject = event.data.subject || "(sin asunto)";
    const { name: fromName, email: fromEmail } = parseFromHeader(event.data.from || "");
    if (!fromEmail) return NextResponse.json({ ok: true });
    const section = sectionFromAddress(toList[0] || "otros@tucv.ar");

    const { html: rawHtml, text } = emailId ? await fetchFullEmail(emailId) : { html: "", text: "" };
    const html = rawHtml ? sanitizeInboundEmailHtml(rawHtml) : "";

    const admin = await pbAdmin();
    // Engancha con un hilo abierto reciente de la MISMA persona en la MISMA
    // sección en vez de abrir uno nuevo por cada mail -- 30 días alcanza
    // para no perder el hilo de un ida y vuelta, sin mezclar
    // conversaciones viejas no relacionadas.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const existingThread = await admin
      .collection("email_threads")
      .getFirstListItem(
        admin.filter("section = {:section} && counterparty_email = {:email} && last_message_at >= {:since}", {
          section,
          email: fromEmail,
          since,
        })
      )
      .catch(() => null);

    const now = new Date().toISOString();
    const thread = existingThread
      ? await admin.collection("email_threads").update(existingThread.id, {
          last_message_at: now,
          unread: true,
        })
      : await admin.collection("email_threads").create({
          section,
          subject,
          counterparty_email: fromEmail,
          counterparty_name: fromName,
          last_message_at: now,
          unread: true,
        });

    await admin.collection("email_messages").create({
      thread: thread.id,
      direction: "in",
      from_email: fromEmail,
      to_emails: toList,
      subject,
      html_body: html,
      text_body: text,
      resend_email_id: emailId || "",
    });
  } catch {
    // Nunca dejamos que un error nuestro haga que Resend reintente infinito
    // -- mismo criterio que app/api/webhooks/resend/route.ts.
  }

  return NextResponse.json({ ok: true });
}
