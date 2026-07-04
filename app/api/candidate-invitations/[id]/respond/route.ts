import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";

// POST: el candidato acepta o rechaza una invitación. Aceptar crea la
// postulación (application) real. Se hace server-side (pbAdmin) para que sea
// atómico y no dependa de reglas de escritura abiertas al cliente.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const action = body.action;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Acción inválida." }, { status: 400 });
  }

  // Autenticar como el usuario candidato dueño de la invitación.
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  try {
    await client.collection("users").authRefresh();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const userId = client.authStore.record?.id;
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const admin = await pbAdmin();
    const invitation = await admin.collection("candidate_invitations").getOne(id).catch(() => null);
    if (!invitation) return NextResponse.json({ error: "Invitación inexistente." }, { status: 404 });

    const candidate = await admin
      .collection("candidate_profiles")
      .getOne(invitation.candidate as string)
      .catch(() => null);
    if (!candidate || candidate.user !== userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }

    // Idempotente: si ya se respondió, devolvemos el estado actual sin re-crear.
    if (invitation.status !== "enviada") {
      return NextResponse.json({ ok: true, status: invitation.status });
    }

    if (action === "reject") {
      await admin.collection("candidate_invitations").update(id, { status: "rechazada" });
      return NextResponse.json({ ok: true, status: "rechazada" });
    }

    await admin.collection("candidate_invitations").update(id, { status: "aceptada" });
    // Crear la postulación si no existe ya una del mismo candidato a la búsqueda.
    const existing = await admin
      .collection("applications")
      .getFirstListItem(
        admin.filter("job_post = {:j} && candidate = {:c}", {
          j: invitation.job_post,
          c: invitation.candidate,
        }),
      )
      .catch(() => null);
    if (!existing) {
      await admin.collection("applications").create({
        job_post: invitation.job_post,
        candidate: invitation.candidate,
        status: "nuevo",
      });
    }
    return NextResponse.json({ ok: true, status: "aceptada" });
  } catch {
    return NextResponse.json({ error: "No se pudo procesar la invitación." }, { status: 500 });
  }
}
