import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { JOB_BOOST_DAYS, JOB_EXTEND_DAYS } from "@/lib/mercadopago-pricing";
import { trackServerEvent } from "@/lib/plausible-server";

const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

// Nunca confiamos en el body de la notificación en sí (cualquiera puede
// pegarle a esta URL con lo que quiera) -- solo lo usamos para saber QUÉ
// payment_id mirar, y le volvemos a preguntar a la API de Mercado Pago cuál
// es su estado real antes de activar nada.
async function extractPaymentId(req: Request): Promise<string | null> {
  const { searchParams } = new URL(req.url);
  const queryId = searchParams.get("data.id") || searchParams.get("id");
  if (queryId && (searchParams.get("type") === "payment" || searchParams.get("topic") === "payment")) {
    return queryId;
  }
  try {
    const body = await req.json();
    if (body?.type === "payment" && body?.data?.id) return String(body.data.id);
    if (body?.topic === "payment" && body?.resource) return String(body.resource).split("/").pop() ?? null;
  } catch {
    // sin body JSON (ej. viene todo por query) -- no es un error
  }
  return null;
}

export async function POST(req: Request) {
  if (!MP_ACCESS_TOKEN) return NextResponse.json({ ok: true });

  const paymentId = await extractPaymentId(req);
  if (!paymentId) return NextResponse.json({ ok: true });

  try {
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!paymentRes.ok) return NextResponse.json({ ok: true });
    const payment = await paymentRes.json();

    const ourPaymentId = payment.external_reference as string | undefined;
    if (!ourPaymentId) return NextResponse.json({ ok: true });

    const admin = await pbAdmin();
    const ourPayment = await admin.collection("payments").getOne(ourPaymentId).catch(() => null);
    if (!ourPayment) return NextResponse.json({ ok: true });

    // Idempotente para reintentos NO concurrentes: MP reintenta notificaciones
    // -- si ya lo procesamos como aprobado, no lo volvemos a aplicar (evita,
    // por ejemplo, reactivar un plan que el negocio ya bajó a mano después).
    // Esto es un read-then-write, no una transacción atómica: dos entregas
    // realmente simultáneas del mismo webhook (raro, pero MP no lo
    // descarta) podrían leer ambas "pending" antes de que cualquiera
    // escriba, y las dos aplicarían el efecto -- en la práctica el peor
    // caso es sumar de más días de boost/extensión a favor del negocio que
    // ya pagó una vez, no una pérdida ni un cobro duplicado, así que se
    // acepta el riesgo en vez de sumar el costo de una traba real (hook +
    // reescritura de esta lógica en JS plano, ver pb_hooks/main.pb.js).
    if (ourPayment.status === "approved") return NextResponse.json({ ok: true });

    if (payment.status === "approved") {
      await admin.collection("payments").update(ourPaymentId, {
        status: "approved",
        mp_payment_id: String(payment.id),
      });
      await trackServerEvent("Pago aprobado", {
        type: ourPayment.type as string,
        amount: ourPayment.amount as number,
      });
      if (ourPayment.type === "plan_pro" || ourPayment.type === "multi_local") {
        await admin
          .collection("business_accounts")
          .update(ourPayment.business, { plan: ourPayment.type === "multi_local" ? "multi_local" : "pro" });
      } else if (ourPayment.type === "job_boost" && ourPayment.job_post) {
        // Si ya estaba destacada (renovación antes de que venza), extiende
        // desde donde estaba en vez de desde ahora -- si no, pagar de nuevo
        // unos días antes de que se venza el destaque tira días pagados a
        // la basura.
        const job = await admin.collection("job_posts").getOne(ourPayment.job_post).catch(() => null);
        if (job) {
          const currentFeatured = job.featured_until ? new Date(job.featured_until as string) : null;
          const base = currentFeatured && currentFeatured.getTime() > Date.now() ? currentFeatured : new Date();
          const featuredUntil = new Date(base.getTime() + JOB_BOOST_DAYS * 24 * 60 * 60 * 1000);
          await admin.collection("job_posts").update(ourPayment.job_post, {
            featured_until: featuredUntil.toISOString(),
          });
        }
      } else if (ourPayment.type === "job_extend" && ourPayment.job_post) {
        // Igual criterio que job_boost: si todavía no venció (pagó
        // preventivamente, antes de que se corte), suma desde el
        // vencimiento actual en vez de desde ahora. Además la reactiva
        // (por si ya había pasado a "Vencida"/"active:false") -- de eso se
        // trata extender, no solo mover una fecha que ya no importa.
        const job = await admin.collection("job_posts").getOne(ourPayment.job_post).catch(() => null);
        if (job) {
          const currentExpiry = job.expires_at ? new Date(job.expires_at as string) : null;
          const base = currentExpiry && currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
          const expiresAt = new Date(base.getTime() + JOB_EXTEND_DAYS * 24 * 60 * 60 * 1000);
          await admin.collection("job_posts").update(ourPayment.job_post, {
            expires_at: expiresAt.toISOString(),
            active: true,
            status: "active",
          });
        }
      }
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await admin
        .collection("payments")
        .update(ourPaymentId, { status: "rejected", mp_payment_id: String(payment.id) });
    }
    // "pending"/"in_process" -- dejamos el registro en pending, MP nos va a
    // volver a notificar cuando cambie de estado.

    return NextResponse.json({ ok: true });
  } catch {
    // Mercado Pago reintenta si no devolvemos 200 -- pero tampoco queremos
    // devolver error real y que reintente infinito por un bug nuestro, así
    // que respondemos ok igual y confiamos en el reintento natural de MP
    // para casos de red transitorios (queda "pending" hasta la próxima).
    return NextResponse.json({ ok: true });
  }
}
