import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { logActivity } from "@/lib/activity";
import { checkRateLimits, getClientIp } from "@/lib/rate-limit";

const RELATIONS = new Set(["conocido", "companiero", "ex_jefe", "cliente", "encargado", "empresa"]);
const HOUR = 60 * 60 * 1000;

// El referente (anónimo, sin cuenta) carga una referencia usando el link único
// del candidato. Queda pending. Rate-limit por IP y por token para frenar spam.
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const referrerName = typeof body.referrer_name === "string" ? body.referrer_name.trim().slice(0, 80) : "";
  const relation = RELATIONS.has(body.relation) ? body.relation : "";
  const company = typeof body.company === "string" ? body.company.trim().slice(0, 120) : "";
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 800) : "";
  const showName = Boolean(body.show_name);

  if (!token) return NextResponse.json({ error: "Link inválido." }, { status: 400 });
  if (!referrerName || !text) {
    return NextResponse.json({ error: "Completá tu nombre y la referencia." }, { status: 400 });
  }

  const rl = checkRateLimits([
    { key: `ref_submit_ip:${ip}`, limit: 5, windowMs: HOUR },
    { key: `ref_submit_token:${token}`, limit: 10, windowMs: HOUR },
  ]);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Probá más tarde." }, { status: 429 });
  }

  try {
    const admin = await pbAdmin();
    const candidate = await admin
      .collection("candidate_profiles")
      .getFirstListItem(`reference_token="${token}"`)
      .catch(() => null);
    if (!candidate) return NextResponse.json({ error: "Este link ya no es válido." }, { status: 404 });

    await admin.collection("candidate_references").create({
      candidate: candidate.id,
      referrer_name: referrerName,
      relation,
      company,
      text,
      show_name: showName,
      status: "pending",
      reporter_ip: ip,
    });
    // Audit privado (no feed público): quién pidió qué es sensible.
    await logActivity(admin, {
      type: "reference_submitted",
      actorType: "candidate",
      candidateId: candidate.id,
      visibility: "private",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo enviar la referencia." }, { status: 500 });
  }
}
