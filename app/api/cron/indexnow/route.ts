import "server-only";
import { NextResponse } from "next/server";
import { todasLasUrlsIndexables } from "@/lib/indexable-urls";
import { submitToIndexNow } from "@/lib/indexnow";

const CRON_SECRET = process.env.CRON_SECRET;

export const dynamic = "force-dynamic";

// Barrido diario: reenvía el conjunto completo indexable a IndexNow, como red
// de seguridad detrás del ping instantáneo de /api/indexnow. A la escala de
// TuCV (decenas/cientos de URLs) reenviar no molesta al buscador, y cubre el
// caso de un ping que se perdió porque Bing estaba caído en ese momento.
//
// Lo dispara el crontab del VPS igual que el resto: run-cron.sh indexnow.
export async function POST(req: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const urls = await todasLasUrlsIndexables();
  const resultado = await submitToIndexNow(urls);

  return NextResponse.json({ ok: true, total: urls.length, resultado });
}
