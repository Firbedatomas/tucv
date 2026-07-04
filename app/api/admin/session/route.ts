import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import PocketBase from "pocketbase";
import { ADMIN_SESSION_COOKIE, createAdminSessionCookieValue } from "@/lib/admin-session";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

// Excluido del chequeo de cookie en middleware.ts a propósito -- este es el
// endpoint que la CREA. La seguridad acá no depende de la cookie sino de
// re-validar el token de PocketBase que manda el cliente contra el propio
// PocketBase (nunca confiamos en un email que venga del body sin validar).
export async function POST(req: NextRequest) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json({ error: "Admin no configurado en el servidor." }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const token = body?.token as string | undefined;
  if (!token) {
    return NextResponse.json({ error: "Falta el token de sesión." }, { status: 400 });
  }

  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  try {
    await client.collection("users").authRefresh();
  } catch {
    return NextResponse.json({ error: "Sesión de Google inválida o vencida." }, { status: 401 });
  }

  const email = client.authStore.record?.email as string | undefined;
  if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const cookieValue = await createAdminSessionCookieValue(email);
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
