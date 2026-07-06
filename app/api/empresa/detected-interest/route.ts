import "server-only";
import { NextResponse } from "next/server";
import { resolveOwnerBusiness } from "@/lib/business-session";
import { getBusinessDetectedInterest } from "@/lib/sourced";

// Candidatos que mostraron interés en las búsquedas detectadas de ESTE negocio
// (ya reclamado). Solo el dueño, validado server-side por el token.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = (body?.token as string) || "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const biz = await resolveOwnerBusiness(token).catch(() => null);
  if (!biz) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const data = await getBusinessDetectedInterest(biz.id);
  return NextResponse.json(data);
}
