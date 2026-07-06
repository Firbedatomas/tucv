import "server-only";
import { NextResponse } from "next/server";
import { resolveUserIdFromToken } from "@/lib/candidate-session";
import { completeClaim } from "@/lib/sourced-claim";

// Reclamo de una empresa detectada: el dueño (logueado, con su business_accounts
// ya creado) vincula el perfil detectado a su cuenta y asciende las búsquedas a
// borradores. El usuario se resuelve SERVER-SIDE desde el token (nunca se confía
// en un id del cliente); completeClaim revalida que el business_account sea suyo.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const sourcedBusinessId = ((body?.sourcedBusinessId as string) || "").trim();
  const businessAccountId = ((body?.businessAccountId as string) || "").trim();
  const token = (body?.token as string) || "";

  if (!/^[a-z0-9]{15}$/.test(sourcedBusinessId) || !/^[a-z0-9]{15}$/.test(businessAccountId)) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const userId = token ? await resolveUserIdFromToken(token).catch(() => null) : null;
  if (!userId) return NextResponse.json({ error: "Iniciá sesión para reclamar." }, { status: 401 });

  const result = await completeClaim({ sourcedBusinessId, businessAccountId, userId });
  if (!result.ok) {
    const status = result.error === "already-claimed" ? 409 : result.error === "no-business" ? 403 : 404;
    const msg =
      result.error === "already-claimed"
        ? "Esta empresa ya fue reclamada."
        : result.error === "no-business"
          ? "No pudimos verificar tu empresa."
          : "Empresa no encontrada.";
    return NextResponse.json({ error: msg }, { status });
  }
  return NextResponse.json({ ok: true, ascended: result.ascended });
}
