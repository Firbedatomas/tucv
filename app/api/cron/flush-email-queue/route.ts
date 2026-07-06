import { NextResponse } from "next/server";
import { deliverEmail } from "@/lib/email/send";
import { listDueEmails, removeFromQueue, rescheduleEmail } from "@/lib/email/queue";
import { countSentToday } from "@/lib/email/log";

const CRON_SECRET = process.env.CRON_SECRET;
// Tope diario de envíos: dejamos headroom bajo la quota del proveedor (Resend
// free = 100/día) para que un envío grande (ej. la campaña semanal) no la reviente
// ni bloquee los mails transaccionales. Lo que pasa el tope se reprograma para
// mañana. Configurable por env; default conservador.
const DAILY_SEND_CAP = Number(process.env.EMAIL_DAILY_CAP) || 90;

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
  const MAX_ATTEMPTS = 4; // total de intentos antes de rendirse
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const now = new Date();
  const due = await listDueEmails(now, BATCH_LIMIT);
  let sent = 0;
  let retried = 0;
  let gaveUp = 0;
  let deferred = 0;

  // Cuánto queda del tope diario, y a dónde diferir lo que sobre (mañana 10:00).
  const sentToday = await countSentToday();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(10, 0, 0, 0);

  for (let i = 0; i < due.length; i++) {
    const email = due[i];
    // Tope diario alcanzado -> el resto se REPROGRAMA para mañana (no es un
    // error, así que no consume intentos). Protege la quota del proveedor.
    if (sentToday + sent >= DAILY_SEND_CAP) {
      await rescheduleEmail(email.id, email.attempts, tomorrow);
      deferred += 1;
      continue;
    }
    // deliverEmail NO reevalúa gates ni quiet-hours (ya pasaron al encolar)
    // pero sí rechequea supresión -- por eso no pasamos skipSuppressionCheck.
    // Envuelto en try/catch: un throw inesperado de UN email (red, PB, etc.) no
    // debe voltear todo el batch (500) ni dejar el email atascado reenviándose
    // -- se trata como error transitorio y se reintenta con backoff.
    let result: { sent: boolean; reason?: string };
    try {
      result = await deliverEmail({
        type: email.type,
        to: email.to,
        userId: email.userId,
        rendered: email.rendered,
        unsubscribeUrl: email.unsubscribeUrl,
      });
    } catch (err) {
      console.error(`[flush] deliverEmail tiró para ${email.to}:`, err instanceof Error ? err.message : err);
      result = { sent: false, reason: "error" };
    }
    if (result.sent) {
      sent += 1;
      await removeFromQueue(email.id);
    } else if (result.reason === "error") {
      // Error TRANSITORIO: reintentar con backoff creciente en vez de perder el
      // email. Tras MAX_ATTEMPTS se descarta.
      const nextAttempts = email.attempts + 1;
      if (nextAttempts < MAX_ATTEMPTS) {
        retried += 1;
        const backoffMin = Math.min(nextAttempts * 20, 240);
        await rescheduleEmail(email.id, nextAttempts, new Date(now.getTime() + backoffMin * 60000));
      } else {
        gaveUp += 1;
        await removeFromQueue(email.id);
      }
    } else {
      // suppressed / preference / no_client: permanente, no tiene sentido reintentar.
      await removeFromQueue(email.id);
    }
    if (i < due.length - 1) await sleep(RATE_DELAY_MS);
  }

  return NextResponse.json({
    ok: true,
    summary: { processed: due.length, sent, retried, gaveUp, deferred, dailyCap: DAILY_SEND_CAP, sentTodayBefore: sentToday, moreLikely: due.length === BATCH_LIMIT },
  });
}
