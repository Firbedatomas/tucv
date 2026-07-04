import { NextResponse } from "next/server";
import PocketBase from "pocketbase";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { maxTeamMembers } from "@/lib/plan-limits";
import { sendTransactionalEmail } from "@/lib/email/send";
import { buildTeamInviteEmail } from "@/lib/email/templates/team-invite";

const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://127.0.0.1:8092";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";
const INVITE_TTL_DAYS = 7;

// Mismo patrón que app/api/mercadopago/checkout/route.ts: valida el token de
// sesión contra PocketBase y devuelve el business_accounts DUEÑO de esa
// sesión (nunca el de otro) -- si quien llama es un colaborador (viewer),
// esto tira porque no tiene fila propia en business_accounts.
async function resolveOwnerBusiness(token: string) {
  const client = new PocketBase(POCKETBASE_URL);
  client.authStore.save(token, null);
  await client.collection("users").authRefresh();
  const userId = client.authStore.record?.id;
  if (!userId) throw new Error("no-user");
  return client.collection("business_accounts").getFirstListItem(`user="${userId}"`);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body.token ?? null;
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }

  let business;
  try {
    business = await resolveOwnerBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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

    return NextResponse.json({ id: invite.id, email: invite.email, status: invite.status, expires: invite.expires });
  } catch {
    return NextResponse.json({ error: "No pudimos enviar la invitación. Probá de nuevo." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let business;
  try {
    business = await resolveOwnerBusiness(token);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
      members: members.map((m) => ({
        id: m.id,
        email: (m.expand?.user as { email?: string } | undefined)?.email ?? "",
        created: m.created,
      })),
      invites: invites.map((i) => ({
        id: i.id,
        email: i.email,
        status: i.status,
        expires: i.expires,
        created: i.created,
      })),
    });
  } catch {
    return NextResponse.json({ error: "No pudimos cargar tu equipo. Probá de nuevo." }, { status: 500 });
  }
}
