import "server-only";
import { NextResponse } from "next/server";
import { recordInterest } from "@/lib/sourced";

// "Me interesa" en una búsqueda NO verificada. Registra la señal de interés
// (gancho de outreach), NO es una postulación formal. La identidad del candidato
// la resuelve el server desde el token (opcional); nunca se confía en un id del
// cliente. Anónimo también cuenta.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const jobId = ((body?.jobId as string) || "").trim();
  const token = (body?.token as string) || undefined;

  // jobId con forma de id de PocketBase (15 alfanum) -- evita basura/inyección.
  if (!/^[a-z0-9]{15}$/.test(jobId)) {
    return NextResponse.json({ error: "Búsqueda inválida." }, { status: 400 });
  }

  const result = await recordInterest(jobId, token);
  if (result === "not_found") {
    return NextResponse.json({ error: "Esa búsqueda ya no está disponible." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
