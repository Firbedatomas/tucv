import { NextResponse } from "next/server";
import { getMemberNumber } from "@/lib/member-number";
import { isMemberKind } from "@/lib/member-card";

export const dynamic = "force-dynamic";

// Número de miembro para la celebración del alta ("sos el postulante N.º 12").
// Devuelve sólo el puesto, el total y la fecha de alta -- ningún dato de la
// persona ni del negocio, así que no hace falta sesión: con el id (15 chars
// aleatorios de PocketBase) lo único que se aprende es cuándo se registró ese
// id, y el total ya es público en las stats del home.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const id = searchParams.get("id");

  if (!isMemberKind(kind) || !id) {
    return NextResponse.json({ error: "Parámetros inválidos." }, { status: 400 });
  }

  const member = await getMemberNumber(kind, id);
  if (!member) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  return NextResponse.json(member);
}
