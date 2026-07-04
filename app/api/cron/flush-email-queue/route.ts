import { NextResponse } from "next/server";
import { deliverEmail } from "@/lib/email/send";
import { listDueEmails, removeFromQueue } from "@/lib/email/queue";

const CRON_SECRET = process.env.CRON_SECRET;

// Vacía la cola de emails diferidos por horario silencioso (ver
// lib/email/send.ts). La pega un cron externo, idealmente cada hora (así un
// email diferido sale poco después de que termine la ventana de silencio,
// no al día siguiente). Mismo secreto que los otros crons.
export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${CRON_SECRET}`) return NextResponse.json({ ok: false }, { status: 401 });

  const now = new Date();
  const due = await listDueEmails(now);
  let sent = 0;

  for (const email of due) {
    // deliverEmail NO reevalúa gates ni quiet-hours (ya pasaron al encolar)
    // pero sí rechequea supresión -- por eso no pasamos skipSuppressionCheck.
    const result = await deliverEmail({
      type: email.type,
      to: email.to,
      userId: email.userId,
      rendered: email.rendered,
      unsubscribeUrl: email.unsubscribeUrl,
    });
    if (result.sent) sent += 1;
    // Se saca de la cola pase lo que pase con el envío (enviado, suprimido, o
    // error de Resend): reintentar en cada corrida un email que Resend
    // rechaza lo dejaría atascado para siempre. El evento en email_events ya
    // deja registro de qué pasó.
    await removeFromQueue(email.id);
  }

  return NextResponse.json({ ok: true, summary: { processed: due.length, sent } });
}
