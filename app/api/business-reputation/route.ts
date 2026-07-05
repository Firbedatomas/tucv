import { NextResponse } from "next/server";
import "server-only";
import { resolveOwnerBusiness } from "@/lib/business-session";
import { computeBusinessReputation } from "@/lib/public-job";

// Reputación propia del negocio para mostrarla en su panel. Reusa exactamente
// la misma computación honesta que el link público (computeBusinessReputation)
// -- la empresa ve lo mismo que ve un candidato, más el crudo (conteos y
// total de postulaciones) para poder mostrarle "cómo mejorarla". Auth por
// token de sesión; solo el dueño (resolveOwnerBusiness) resuelve -- a un
// colaborador le da 401 y el panel simplemente no muestra la tarjeta.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let business;
  try {
    business = await resolveOwnerBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const reputation = await computeBusinessReputation(business.id, Boolean(business.verified));
    return NextResponse.json(reputation);
  } catch {
    return NextResponse.json({ error: "No pudimos calcular tu reputación." }, { status: 500 });
  }
}
