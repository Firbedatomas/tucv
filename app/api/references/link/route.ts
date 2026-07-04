import { NextResponse } from "next/server";
import "server-only";
import { randomUUID } from "node:crypto";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveUserIdFromToken } from "@/lib/candidate-session";
import { logActivity } from "@/lib/activity";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

// El candidato pide su link único de referencias. Lo generamos server-side
// (token aleatorio) la primera vez y lo reusamos después. Solo el dueño.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = await resolveUserIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const admin = await pbAdmin();
    const candidate = await admin
      .collection("candidate_profiles")
      .getFirstListItem(`user="${userId}"`)
      .catch(() => null);
    if (!candidate) return NextResponse.json({ error: "Sin perfil." }, { status: 404 });

    let refToken = candidate.reference_token as string;
    if (!refToken) {
      refToken = randomUUID().replace(/-/g, "");
      await admin.collection("candidate_profiles").update(candidate.id, { reference_token: refToken });
      await logActivity(admin, {
        type: "reference_requested",
        actorType: "candidate",
        candidateId: candidate.id,
        visibility: "internal",
      });
    }
    return NextResponse.json({ token: refToken, url: `${BASE_URL}/r/${refToken}` });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el link." }, { status: 500 });
  }
}
