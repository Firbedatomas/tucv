import "server-only";
import { NextResponse } from "next/server";
import { recolectarEvidencia } from "@/lib/intelligence/product-evidence";
import { detectarSenales } from "@/lib/intelligence/product-signals";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

// Loop de producto, FASE DE OBSERVACIÓN.
//
// Este endpoint solo LEE y devuelve el diagnóstico. No toca código, no abre
// PRs, no modifica datos. Es a propósito: el playbook manda arrancar
// conservador y subir la autonomía recién con evidencia de que el detector
// acierta en este dominio. Con los volúmenes actuales de TuCV todavía no hay
// forma de saberlo.
//
// Lo dispara scripts/product-loop.sh, que además mantiene el progress.md.
export async function POST(req: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const evidencia = await recolectarEvidencia();
  const hallazgos = detectarSenales(evidencia);

  return NextResponse.json({ ok: true, fecha: new Date().toISOString(), evidencia, hallazgos });
}
