import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";

// business_accounts.listRule está restringido al dueño (`user = @request.auth.id`)
// -- correcto para no abrir el CRUD completo, pero el autocomplete de
// "empresa" en la experiencia del postulante necesita poder buscar por
// nombre sin login. Mismo patrón que /api/public-job y /api/public-profile:
// resolvemos server-side con el superusuario y devolvemos solo lo público
// (id + nombre + zona), nada de datos de contacto del negocio.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) return NextResponse.json({ items: [] });

  try {
    const client = await pbAdmin();
    const results = await client.collection("business_accounts").getList(1, 5, {
      filter: client.filter("business_name ~ {:q}", { q }),
      sort: "business_name",
    });
    return NextResponse.json({
      items: results.items.map((b) => ({
        id: b.id,
        business_name: b.business_name,
        city_zone: b.city_zone,
      })),
    });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
