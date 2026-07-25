import "server-only";
import { NextResponse } from "next/server";
import { runDailyCapture } from "@/lib/places-capture";

const CRON_SECRET = process.env.CRON_SECRET;

// Captura de PYMES desde Google Places -> siembra solo las que tienen email.
//
// Places NO devuelve email: se saca del sitio del negocio. Rinde ~18% sobre
// los que tienen sitio y ~2 de cada 3 lo tienen, así que hacen falta ~9
// escaneos por negocio guardado. Por eso el tope de escaneos: acota el gasto
// de la API de Places, que es paga.
//
// `?limit=` y `?scan=` permiten ajustarlo sin redeploy.
export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 200, 500);
  const maxEscaneos = Math.min(Number(url.searchParams.get("scan")) || 2500, 6000);
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const result = await runDailyCapture(dayNumber, limit, { requireEmail: true, maxEscaneos });
  return NextResponse.json({ ok: true, ...result });
}
