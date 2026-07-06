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

  // Robustez a escala: se procesa un LOTE acotado por corrida (para no timeoutear
  // el request del cron cuando la cola es grande) y con un pequeño delay entre
  // envíos (rate-limit para no reventar el límite de Resend, ~8/seg). El cron
  // pega seguido, así una cola grande se drena en varias corridas.
  const BATCH_LIMIT = 100;
  const RATE_DELAY_MS = 120;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const now = new Date();
  const due = await listDueEmails(now, BATCH_LIMIT);
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < due.length; i++) {
    const email = due[i];
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
    else if (result.reason === "error") failed += 1;
    // Se saca de la cola pase lo que pase (enviado, suprimido, o error de
    // Resend): sin campo de reintentos, dejarlo reintentando lo atascaría para
    // siempre. El evento en email_events ya deja registro. (El reintento con
    // backoff acotado queda para la fase de campañas, que suma `attempts`.)
    await removeFromQueue(email.id);
    if (i < due.length - 1) await sleep(RATE_DELAY_MS);
  }

  return NextResponse.json({
    ok: true,
    summary: { processed: due.length, sent, failed, batchLimit: BATCH_LIMIT, moreLikely: due.length === BATCH_LIMIT },
  });
}
