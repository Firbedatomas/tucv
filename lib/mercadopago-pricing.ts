import "server-only";

// Compartido entre checkout y webhook -- si alguno importara al otro (dos
// route handlers importándose entre sí) queda raro para el bundling de
// rutas de Next, mejor un módulo aparte.
export const PLAN_PRO_PRICE_ARS = Number(process.env.MERCADOPAGO_PLAN_PRO_PRICE || "9900");
export const JOB_BOOST_PRICE_ARS = Number(process.env.MERCADOPAGO_JOB_BOOST_PRICE || "4900");
export const JOB_BOOST_DAYS = 7;
export const PLAN_MULTI_LOCAL_PRICE_ARS = Number(process.env.MERCADOPAGO_MULTI_LOCAL_PRICE || "39900");
// Plan gratis: la búsqueda dura solo 7 días (lib/plan-limits.ts,
// maxDurationDays). Si se vence o está por vencerse y todavía no
// consiguieron a nadie, extender esa MISMA publicación (mismo slug/QR/link
// ya impreso) es más útil que forzar a crear una nueva -- que además el
// límite de "1 búsqueda por mes" del plan gratis ni siquiera dejaría hacer
// antes de que pase el mes.
export const JOB_EXTEND_PRICE_ARS = Number(process.env.MERCADOPAGO_JOB_EXTEND_PRICE || "4900");
export const JOB_EXTEND_DAYS = 15;
