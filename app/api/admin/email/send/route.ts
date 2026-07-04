import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { getResendClient } from "@/lib/email/client";
import { requireAdminOrResponse } from "@/lib/admin/require-admin";

export async function POST(req: Request) {
  const unauthorized = await requireAdminOrResponse();
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => null);
  const threadId = body?.threadId as string | undefined;
  const html = body?.html as string | undefined;
  const subjectOverride = body?.subject as string | undefined;
  if (!threadId || !html?.trim()) {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }

  const admin = await pbAdmin();
  const thread = await admin.collection("email_threads").getOne(threadId).catch(() => null);
  if (!thread) return NextResponse.json({ error: "Hilo no encontrado." }, { status: 404 });

  const resend = getResendClient();
  if (!resend) {
    return NextResponse.json({ error: "RESEND_API_KEY no configurada en el servidor." }, { status: 500 });
  }

  const subject = subjectOverride || `Re: ${thread.subject || "sin asunto"}`;
  const fromAddress = `TuCV <${thread.section}@tucv.ar>`;

  const result = await resend.emails.send({
    from: fromAddress,
    to: thread.counterparty_email as string,
    subject,
    html,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 502 });
  }

  await admin.collection("email_messages").create({
    thread: thread.id,
    direction: "out",
    from_email: `${thread.section}@tucv.ar`,
    to_emails: [thread.counterparty_email],
    subject,
    html_body: html,
    resend_email_id: result.data?.id || "",
  });
  await admin.collection("email_threads").update(thread.id, {
    last_message_at: new Date().toISOString(),
    unread: false,
  });

  return NextResponse.json({ ok: true });
}
