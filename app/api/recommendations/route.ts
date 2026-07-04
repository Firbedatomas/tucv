import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveUserFromToken } from "@/lib/candidate-session";
import { logActivity } from "@/lib/activity";
import { checkRateLimit } from "@/lib/rate-limit";

const RELATIONS = new Set(["conocido", "companiero", "ex_jefe", "cliente", "encargado", "empresa"]);
const DAY = 24 * 60 * 60 * 1000;

// Un usuario logueado y con email verificado deja una recomendación (aval).
// Sin anónimo, sin autorrecomendación, una por usuario/perfil. Queda pending.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
  const relation = RELATIONS.has(body.relation) ? body.relation : "";
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 500) : "";
  const showName = Boolean(body.show_name);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!candidateId) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });

  const user = await resolveUserFromToken(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!user.verified) {
    return NextResponse.json({ error: "Verificá tu email para recomendar." }, { status: 403 });
  }

  const rl = checkRateLimit({ key: `recommend:${user.id}`, limit: 20, windowMs: DAY });
  if (!rl.allowed) return NextResponse.json({ error: "Demasiadas recomendaciones hoy." }, { status: 429 });

  try {
    const admin = await pbAdmin();
    const candidate = await admin.collection("candidate_profiles").getOne(candidateId).catch(() => null);
    if (!candidate) return NextResponse.json({ error: "Perfil inexistente." }, { status: 404 });
    if (candidate.user === user.id) {
      return NextResponse.json({ error: "No podés recomendarte a vos mismo." }, { status: 400 });
    }
    if (candidate.allow_recommendations === false) {
      return NextResponse.json({ error: "Este perfil no acepta recomendaciones." }, { status: 403 });
    }

    // Nombre del recomendador desde su propio perfil (si tiene), para el caso
    // en que acepte mostrarlo. Nunca su email ni datos de contacto.
    const mine = await admin
      .collection("candidate_profiles")
      .getFirstListItem(`user="${user.id}"`, { fields: "name", requestKey: null })
      .catch(() => null);

    try {
      await admin.collection("recommendations").create({
        candidate: candidateId,
        recommender_user: user.id,
        recommender_name: (mine?.name as string) || "",
        relation,
        text,
        show_name: showName,
        status: "pending",
      });
    } catch {
      return NextResponse.json({ error: "Ya recomendaste este perfil." }, { status: 409 });
    }
    await logActivity(admin, {
      type: "recommendation_created",
      actorType: "candidate",
      candidateId,
      visibility: "internal",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo recomendar." }, { status: 500 });
  }
}
