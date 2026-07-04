import { NextResponse } from "next/server";
import { PLAN_PRO_PRICE_ARS, PLAN_MULTI_LOCAL_PRICE_ARS, JOB_BOOST_PRICE_ARS } from "@/lib/mercadopago-pricing";

// Los precios en sí no son secretos (ya se muestran en /precios, server
// component) -- esto solo existe para poder leerlos desde un componente
// cliente como PlanUpgradeCard, que no puede importar el módulo server-only.
export async function GET() {
  return NextResponse.json({
    pro: PLAN_PRO_PRICE_ARS,
    multiLocal: PLAN_MULTI_LOCAL_PRICE_ARS,
    jobBoost: JOB_BOOST_PRICE_ARS,
  });
}
