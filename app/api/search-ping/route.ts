import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { rutaDeBusqueda } from "@/lib/indexable-urls";
import { submitToIndexNow } from "@/lib/indexnow";
import { notificarAGoogle } from "@/lib/google-indexing";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

export const dynamic = "force-dynamic";

// Avisa a los buscadores que una búsqueda se publicó o cambió. Antes esto era
// /api/indexnow (solo Bing); ahora pega a los dos canales, de ahí el nombre:
//   - IndexNow  -> Bing/Yandex, y con eso los asistentes de IA que navegan
//                  (ChatGPT/Copilot leen el índice de Bing).
//   - Indexing API -> Google, permitido porque estas URLs llevan JobPosting.
//
// La búsqueda se crea client-side contra PocketBase (ver JobPostForm.tsx), así
// que el aviso sale de acá.
//
// Recibe un ID, NO una URL: si aceptara una URL arbitraria, cualquiera podría
// hacernos gastar la cuota de ambos protocolos -- y en el caso de Google,
// mandar una URL fuera de política pone en riesgo el acceso a la API. Acá la
// URL se deriva del registro real, del lado servidor.
export async function POST(req: Request) {
  const limite = checkRateLimit({
    key: `search-ping:${getClientIp(req)}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!limite.allowed) {
    return NextResponse.json({ ok: false, error: "demasiados pedidos" }, { status: 429 });
  }

  let jobId: unknown;
  try {
    jobId = (await req.json())?.jobId;
  } catch {
    return NextResponse.json({ ok: false, error: "body inválido" }, { status: 400 });
  }
  if (typeof jobId !== "string" || jobId.length === 0 || jobId.length > 40) {
    return NextResponse.json({ ok: false, error: "jobId inválido" }, { status: 400 });
  }

  let path: string | null = null;
  try {
    const admin = await pbAdmin();
    const job = await admin.collection("job_posts").getOne(jobId, { expand: "business" });
    // Solo se avisa de búsquedas activas: una cerrada va con noindex, pedirle
    // a un buscador que la rastree sería contradecir nuestra propia metadata.
    if (job.active !== true) {
      return NextResponse.json({ ok: true, skipped: "búsqueda no activa" });
    }
    const businessName = (job.expand?.business as { business_name?: string } | undefined)?.business_name;
    path = rutaDeBusqueda({
      slug: job.slug as string | undefined,
      short_code: job.short_code as string | undefined,
      businessName,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "búsqueda no encontrada" }, { status: 404 });
  }

  if (!path) {
    return NextResponse.json({ ok: false, error: "no se pudo derivar la URL" }, { status: 422 });
  }

  const url = `${BASE_URL}${path}`;
  // En paralelo: son dos servicios independientes y ninguno debe esperar al
  // otro. `allSettled` porque un canal caído no invalida el otro.
  const [bing, google] = await Promise.allSettled([
    submitToIndexNow([url]),
    notificarAGoogle(url, "URL_UPDATED"),
  ]);

  return NextResponse.json({
    ok: true,
    path,
    bing: bing.status === "fulfilled" ? bing.value : { ok: false, reason: "excepción" },
    google: google.status === "fulfilled" ? google.value : { ok: false, razon: "excepción" },
  });
}
