import { pbAdmin } from "@/lib/pocketbase-admin";

// El archivo de PocketBase (pb.tucv.ar) no manda Access-Control-Allow-Origin
// -- un <img crossOrigin="anonymous"> a esa URL directa nunca termina de
// cargar, y sin crossOrigin el canvas queda "tainted" (toDataURL tira
// SecurityError). Este proxy same-origin (tucv.ar/api/...) resuelve eso:
// lo pedimos server-to-server acá (sin restricción CORS entre servidores) y
// lo servimos desde el mismo origen que la página que arma el canvas.
const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

export async function GET(_req: Request, { params }: { params: Promise<{ businessId: string }> }) {
  const { businessId } = await params;
  try {
    const client = await pbAdmin();
    const business = await client.collection("business_accounts").getOne(businessId);
    if (!business.logo) return new Response(null, { status: 404 });

    const fileUrl = `${POCKETBASE_URL}/api/files/${business.collectionId}/${business.id}/${business.logo}`;
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) return new Response(null, { status: 404 });

    const buf = await fileRes.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": fileRes.headers.get("content-type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
