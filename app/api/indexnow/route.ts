import "server-only";
import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { rutaDeBusqueda } from "@/lib/indexable-urls";
import { submitToIndexNow } from "@/lib/indexnow";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

export const dynamic = "force-dynamic";

// Ping instantáneo a IndexNow cuando se publica o edita una búsqueda.
//
// La búsqueda se crea client-side contra PocketBase (ver
// components/empresa/JobPostForm.tsx), así que el aviso tiene que salir de
// acá: el cliente pega este endpoint fire-and-forget después de guardar.
//
// Recibe un ID, NO una URL. Es a propósito: si aceptara una URL arbitraria,
// cualquiera podría hacernos gastar la cuota del protocolo con rutas que no
// existen. Acá la URL se deriva del registro real, del lado servidor.
export async function POST(req: Request) {
  const limite = checkRateLimit({
    key: `indexnow:${getClientIp(req)}`,
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
    // a Bing que la rastree sería contradecir nuestra propia metadata.
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

  const resultado = await submitToIndexNow([`${BASE_URL}${path}`]);
  return NextResponse.json({ ok: true, path, resultado });
}
