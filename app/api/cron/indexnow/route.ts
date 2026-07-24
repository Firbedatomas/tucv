import "server-only";
import { NextResponse } from "next/server";
import { busquedasIndexables, todasLasUrlsIndexables } from "@/lib/indexable-urls";
import { submitToIndexNow } from "@/lib/indexnow";
import { notificarAGoogle } from "@/lib/google-indexing";

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

export const dynamic = "force-dynamic";

// Ventana de "cambió hace poco". Tiene que ser mayor que el intervalo del cron
// (diario) para que un cambio no se escape entre dos corridas.
const VENTANA_MS = 48 * 60 * 60 * 1000;

// Barrido diario, red de seguridad detrás del ping instantáneo de
// /api/search-ping (por si un buscador estaba caído justo en ese momento).
//
// Los dos canales NO reciben lo mismo, y es a propósito:
//
//   - IndexNow (Bing) recibe TODO el conjunto indexable. El protocolo no
//     restringe tipos de contenido y a esta escala reenviar no molesta.
//
//   - Indexing API (Google) recibe SOLO las búsquedas, y solo las que
//     cambiaron en las últimas 48hs. Dos motivos:
//     1) La API está restringida POR POLÍTICA a JobPosting/BroadcastEvent.
//        Mandar la home o /precios no da un error visible: se paga con la
//        cuenta marcada y la pérdida del acceso. `notificarAGoogle` lo
//        bloquea igual (ver esUrlDeBusqueda), pero no le tiramos basura a
//        propósito para que la rebote.
//     2) Google pide no reenviar una URL que no cambió. Reenviar las mismas
//        3 búsquedas todos los días sería ruido, no red de seguridad.
export async function POST(req: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET no configurado" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const urls = await todasLasUrlsIndexables();
  const bing = await submitToIndexNow(urls);

  const corte = Date.now() - VENTANA_MS;
  const recientes = (await busquedasIndexables()).filter((b) => b.actualizada.getTime() >= corte);

  let googleOk = 0;
  const googleErrores: string[] = [];
  for (const b of recientes) {
    const r = await notificarAGoogle(`${BASE_URL}${b.path}`, "URL_UPDATED");
    if (r.ok) googleOk += 1;
    else googleErrores.push(`${b.path}: ${r.razon}`);
  }

  return NextResponse.json({
    ok: true,
    bing: { total: urls.length, resultado: bing },
    google: { candidatas: recientes.length, enviadas: googleOk, errores: googleErrores },
  });
}
