import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { APPLICATION_STATUS } from "@/lib/constants";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const VALID_STATUS = new Set(APPLICATION_STATUS.map((s) => s.value));

// userId de un token de sesión de PocketBase, o null si no es válido.
async function userIdFromToken(token: string | null): Promise<string | null> {
  if (!token) return null;
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  try {
    await client.collection("users").authRefresh();
    return (client.authStore.record?.id as string) || null;
  } catch {
    return null;
  }
}

// ¿Puede este usuario ver/tocar esta postulación? Owner del negocio dueño de
// la búsqueda, o cualquier colaborador (business_members) del mismo negocio.
// Devuelve el registro de la postulación (con job_post expandido) o null.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function authorizeApplication(admin: PocketBase, applicationId: string, userId: string): Promise<any | null> {
  const application = await admin
    .collection("applications")
    .getOne(applicationId, { expand: "job_post" })
    .catch(() => null);
  if (!application) return null;

  const jobPost = application.expand?.job_post as { business?: string } | undefined;
  const businessId = jobPost?.business;
  if (!businessId) return null;

  const business = await admin.collection("business_accounts").getOne(businessId).catch(() => null);
  if (business?.user === userId) return application;

  const membership = await admin
    .collection("business_members")
    .getFirstListItem(admin.filter("business = {:b} && user = {:u}", { b: businessId, u: userId }))
    .catch(() => null);
  return membership ? application : null;
}

// Cambiar el estado de un postulante + dejar constancia de quién lo hizo.
// Va por el server (no client-side directo) por dos motivos: (1) escribir el
// evento de auditoría en application_status_events, cuyo createRule está
// cerrado; (2) revalidar acá el acceso al negocio en vez de confiar en la UI.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = typeof body.status === "string" ? body.status : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";

  const userId = await userIdFromToken(body.pbToken ?? null);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!VALID_STATUS.has(status)) return NextResponse.json({ error: "invalid_status" }, { status: 400 });

  try {
    const admin = await pbAdmin();
    const application = await authorizeApplication(admin, id, userId);
    if (!application) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const fromStatus = (application.status as string) || "";

    // Sin cambio real y sin nota: no ensuciamos la traza con un evento "X -> X".
    // (Con nota sí lo registramos: dejar una nota interna es una acción real
    // aunque el estado no cambie.)
    if (fromStatus === status && !note) {
      return NextResponse.json({ ok: true, status, unchanged: true });
    }

    if (fromStatus !== status) {
      await admin.collection("applications").update(id, { status });
    }
    await admin.collection("application_status_events").create({
      application: id,
      status,
      from_status: fromStatus || null,
      note: note || null,
      changed_by: userId,
    });

    return NextResponse.json({ ok: true, status });
  } catch {
    return NextResponse.json({ error: "No pudimos actualizar el estado. Probá de nuevo." }, { status: 500 });
  }
}

// Historial de cambios de estado de una postulación, con el nombre de quién
// hizo cada uno resuelto server-side (expandir `changed_by` client-side no
// sirve: la viewRule de users no deja ver a otros usuarios).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  const userId = await userIdFromToken(token);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const admin = await pbAdmin();
    const application = await authorizeApplication(admin, id, userId);
    if (!application) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const events = await admin.collection("application_status_events").getFullList({
      filter: admin.filter("application = {:a}", { a: id }),
      sort: "-created",
    });

    // Resolver nombres de una sola pasada (pocas filas, equipo chico).
    const changerIds = [...new Set(events.map((e) => e.changed_by as string).filter(Boolean))];
    const names: Record<string, string> = {};
    await Promise.all(
      changerIds.map(async (uid) => {
        const u = await admin.collection("users").getOne(uid).catch(() => null);
        if (u) names[uid] = (u.name as string) || (u.email as string) || "Alguien del equipo";
      }),
    );

    return NextResponse.json({
      events: events.map((e) => ({
        id: e.id,
        status: e.status,
        from_status: e.from_status || null,
        note: e.note || null,
        by: e.changed_by ? names[e.changed_by as string] ?? "Alguien del equipo" : null,
        byMe: e.changed_by === userId,
        created: e.created,
      })),
    });
  } catch {
    return NextResponse.json({ error: "No pudimos cargar el historial." }, { status: 500 });
  }
}
