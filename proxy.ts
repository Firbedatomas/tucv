import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookieValue } from "@/lib/admin-session";

// Único proxy (ex-middleware, ver Next.js 16) del proyecto: protege todo lo
// bajo /admin y /api/admin. El resto del sitio (empresa/postulante) sigue
// con su patrón existente de auth client-side vía hooks -- acá hace falta
// enforcement real porque el panel expone datos de todos los
// negocios/postulantes y pagos.
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

const PUBLIC_PATHS = new Set(["/admin/login", "/api/admin/session"]);

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const email = await verifyAdminSessionCookieValue(cookie);
  if (!email) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}
