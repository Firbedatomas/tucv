import { NextResponse } from "next/server";
import PocketBase, { type RecordModel } from "pocketbase";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { maxTeamMembers } from "@/lib/plan-limits";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildTeamInviteEmail } from "@/lib/email/templates/team-invite";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";
const INVITE_TTL_DAYS = 7;

// Quién puede gestionar el equipo de un negocio: el dueño (fila en
// business_accounts) o un colaborador con rol admin (business_members). Valida
// el token de sesión contra PocketBase para sacar el userId, y después resuelve
// el negocio con pbAdmin -- un admin no tiene permiso de LEER su business_accounts
// directo, así que la resolución va server-side, no con el cliente del usuario.
// Devuelve null si la sesión no gestiona ningún equipo (ej. un reviewer).
async function resolveTeamManager(
  token: string,
): Promise<{ business: RecordModel; callerRole: "owner" | "admin" } | null> {
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  try {
    await client.collection("users").authRefresh();
  } catch {
    return null;
  }
  const userId = client.authStore.record?.id;
  if (!userId) return null;

  const admin = await pbAdmin();
  const owned = await admin
    .collection("business_accounts")
    .getFirstListItem(`user="${userId}"`)
    .catch(() => null);
  if (owned) return { business: owned, callerRole: "owner" };

  const membership = await admin
    .collection("business_members")
    .getFirstListItem(admin.filter("user = {:u} && role = {:r}", { u: userId, r: "admin" }), {
      expand: "business",
    })
    .catch(() => null);
  const biz = membership?.expand?.business as RecordModel | undefined;
  if (membership && biz) return { business: biz, callerRole: "admin" };

  return null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  // Rol con el que se invita. Cae a "reviewer" (el más acotado) ante cualquier
  // valor que no sea exactamente "admin".
  const role = body.role === "admin" ? "admin" : "reviewer";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }

  const manager = await resolveTeamManager(token);
  if (!manager) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const business = manager.business;

  const limit = maxTeamMembers(business.plan as string);
  if (limit === 0) {
    return NextResponse.json({ error: "Tu plan no incluye invitar miembros de equipo." }, { status: 403 });
  }

  try {
    const admin = await pbAdmin();
    const [members, pendingInvites] = await Promise.all([
      admin.collection("business_members").getFullList({
        filter: admin.filter("business = {:id}", { id: business.id }),
        expand: "user",
      }),
      admin.collection("business_invites").getFullList({
        filter: admin.filter("business = {:id} && status = {:status}", { id: business.id, status: "pending" }),
      }),
    ]);

    // Invitaciones idempotentes: una sola relación por persona. Si ya es
    // miembro activo o ya tiene una invitación pendiente, NO creamos otra
    // fila -- así el dueño no termina viendo el mismo email duplicado en el
    // panel (ver TeamSection). El caso "ya aceptó" se cubre con members
    // porque al aceptar se crea la fila en business_members.
    const alreadyMember = members.some(
      (m) => ((m.expand?.user as { email?: string } | undefined)?.email ?? "").toLowerCase() === email,
    );
    if (alreadyMember) {
      return NextResponse.json({ error: "Esa persona ya es parte de tu equipo." }, { status: 409 });
    }
    if (pendingInvites.some((i) => (i.email as string).toLowerCase() === email)) {
      return NextResponse.json({ error: "Ya le enviaste una invitación y sigue pendiente." }, { status: 409 });
    }

    if (members.length + pendingInvites.length >= limit) {
      return NextResponse.json(
        { error: `Ya usaste tus ${limit} cupos de equipo para este plan.` },
        { status: 400 },
      );
    }

    const expires = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const invite = await admin.collection("business_invites").create({
      business: business.id,
      email,
      role,
      status: "pending",
      expires,
    });

    // El invitado todavía no tiene usuario en TuCV -- no hay userId para
    // pasar (ni preferencias que respetar todavía), mismo criterio que
    // welcome_*. Un error acá (ej. Resend caído) no debería tirar la
    // invitación ya creada -- se loguea y sigue, el dueño puede reenviar el
    // link a mano si hace falta.
    await sendTransactionalEmail({
      type: "team_invite",
      to: email,
      rendered: buildTeamInviteEmail({
        businessName: (business.business_name as string) || "",
        inviteUrl: `${BASE_URL}/empresa/invitacion/${invite.token}`,
      }),
    }).catch(() => {});

    return NextResponse.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      expires: invite.expires,
    });
  } catch {
    return NextResponse.json({ error: "No pudimos enviar la invitación. Probá de nuevo." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const manager = await resolveTeamManager(token);
  if (!manager) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const business = manager.business;

  try {
    const admin = await pbAdmin();
    const [members, invites] = await Promise.all([
      admin.collection("business_members").getFullList({
        filter: admin.filter("business = {:id}", { id: business.id }),
        expand: "user",
        sort: "created",
      }),
      admin.collection("business_invites").getFullList({
        filter: admin.filter("business = {:id}", { id: business.id }),
        sort: "-created",
      }),
    ]);

    return NextResponse.json({
      limit: maxTeamMembers(business.plan as string),
      callerRole: manager.callerRole,
      members: members.map((m) => ({
        id: m.id,
        email: (m.expand?.user as { email?: string } | undefined)?.email ?? "",
        role: (m.role as string) || "reviewer",
        created: m.created,
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        role: (i.role as string) || "reviewer",
        status: i.status,
        expires: i.expires,
        created: i.created,
      })),
    });
  } catch {
    return NextResponse.json({ error: "No pudimos cargar tu equipo. Probá de nuevo." }, { status: 500 });
  }
}
