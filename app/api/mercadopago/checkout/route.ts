import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import {
  PLAN_PRO_PRICE_ARS,
  JOB_BOOST_PRICE_ARS,
  PLAN_MULTI_LOCAL_PRICE_ARS,
  JOB_EXTEND_PRICE_ARS,
} from "@/lib/mercadopago-pricing";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

// Valida el token de sesión del negocio autenticándolo contra PocketBase
// (en vez de reinventar verificación de JWT) y devuelve SU PROPIO
// business_accounts -- la regla de acceso normal (`user = @request.auth.id`)
// ya se encarga de que no pueda ver/usar el de otro.
async function resolveBusiness(token: string) {
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  await client.collection("users").authRefresh();
  const userId = client.authStore.record?.id;
  if (!userId) throw new Error("no-user");
  return client.collection("business_accounts").getFirstListItem(`user="${userId}"`);
}

export async function POST(req: Request) {
  if (!MP_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado todavía (falta MERCADOPAGO_ACCESS_TOKEN)." },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const type = body.type ?? "plan_pro";
  const jobPostId = body.jobPostId ?? null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const VALID_TYPES = ["plan_pro", "job_boost", "multi_local", "job_extend"];
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "tipo de pago inválido" }, { status: 400 });
  }

  let business;
  try {
    business = await resolveBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = await pbAdmin();

    const needsJobPost = type === "job_boost" || type === "job_extend";
    let jobPost = null;
    if (needsJobPost) {
      if (!jobPostId) return NextResponse.json({ error: "falta la búsqueda" }, { status: 400 });
      // Confirma que la búsqueda sea del NEGOCIO QUE PAGA -- sin esto,
      // cualquiera con sesión podría destacar/extender la búsqueda de otro
      // negocio solo adivinando o mirando su id en la URL pública.
      jobPost = await admin.collection("job_posts").getOne(jobPostId).catch(() => null);
      if (!jobPost || jobPost.business !== business.id) {
        return NextResponse.json({ error: "no encontramos esa búsqueda" }, { status: 404 });
      }
    }

    const amount =
      type === "job_boost"
        ? JOB_BOOST_PRICE_ARS
        : type === "job_extend"
          ? JOB_EXTEND_PRICE_ARS
          : type === "multi_local"
            ? PLAN_MULTI_LOCAL_PRICE_ARS
            : PLAN_PRO_PRICE_ARS;
    const payment = await admin.collection("payments").create({
      business: business.id,
      job_post: needsJobPost ? jobPostId : "",
      type,
      amount,
      status: "pending",
    });

    const title =
      type === "job_boost"
        ? "TuCV — Destacar búsqueda (7 días)"
        : type === "job_extend"
          ? "TuCV — Extender búsqueda (15 días)"
          : type === "multi_local"
            ? "TuCV — Plan Equipo (1 mes)"
            : "TuCV — Plan Pro (1 mes)";
    const description =
      type === "job_boost"
        ? `Prioridad y color destacado para "${jobPost?.role ?? "tu búsqueda"}" en la home.`
        : type === "job_extend"
          ? `Suma 15 días más a "${jobPost?.role ?? "tu búsqueda"}", mismo link y QR de siempre.`
          : type === "multi_local"
            ? "Hasta 10 búsquedas activas y auto-boost para negocios con alta rotación."
            : "Búsquedas activas ilimitadas y auto-boost para tus búsquedas.";
    const backPath = needsJobPost ? `/empresa/busquedas/${jobPostId}` : "/empresa/perfil";

    const preferenceRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        items: [
          {
            title,
            description,
            quantity: 1,
            currency_id: "ARS",
            unit_price: amount,
          },
        ],
        external_reference: payment.id,
        back_urls: {
          success: `${BASE_URL}${backPath}?pago=exito`,
          pending: `${BASE_URL}${backPath}?pago=pendiente`,
          failure: `${BASE_URL}${backPath}?pago=error`,
        },
        auto_return: "approved",
        notification_url: `${BASE_URL}/api/mercadopago/webhook`,
      }),
    });

    if (!preferenceRes.ok) {
      const errBody = await preferenceRes.text();
      await admin.collection("payments").update(payment.id, { status: "rejected" });
      throw new Error(`Mercado Pago preference error: ${errBody}`);
    }

    const preference = await preferenceRes.json();
    await admin.collection("payments").update(payment.id, { mp_preference_id: preference.id });

    return NextResponse.json({ init_point: preference.init_point });
  } catch {
    return NextResponse.json({ error: "No pudimos iniciar el pago. Probá de nuevo." }, { status: 500 });
  }
}
