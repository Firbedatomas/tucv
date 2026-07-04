import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookieValue } from "@/lib/admin-session";

// El proxy.ts ya bloquea /api/admin/*, pero cada route handler vuelve a
// validar acá (defensa en profundidad) -- ver Fase 1 del plan de admin.
export async function requireAdminOrResponse(): Promise<NextResponse | null> {
  const store = await cookies();
  const email = await verifyAdminSessionCookieValue(store.get(ADMIN_SESSION_COOKIE)?.value);
  if (!email) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  return null;
}
