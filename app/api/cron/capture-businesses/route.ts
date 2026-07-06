import "server-only";
import { NextResponse } from "next/server";
import { runDailyCapture } from "@/lib/places-capture";

const CRON_SECRET = process.env.CRON_SECRET;

// Captura diaria de PYMES desde Google Places -> siembra hasta 50 nuevas. Rota
// combos (rubro x zona) por día. Lo pega un cron externo (scripts/run-cron.sh).
export async function POST(req: Request) {
  if (!CRON_SECRET) return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const dayNumber = Math.floor(Date.now() / 86_400_000);
  const result = await runDailyCapture(dayNumber, 50);
  return NextResponse.json({ ok: true, ...result });
}
