import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

// Un solo click apaga TODO lo no crítico (digests, consejos de perfil,
// marketing) -- no granular por categoría. Para reactivar una categoría
// puntual (ej. solo quiere el digest diario de vuelta) está el centro de
// preferencias en /configuracion/notificaciones, con sesión iniciada.
async function unsubscribeAll(token: string): Promise<boolean> {
  const admin = await pbAdmin();
  const prefs = await admin
    .collection("notification_preferences")
    .getFirstListItem(admin.filter("unsubscribe_token = {:token}", { token }))
    .catch(() => null);
  if (!prefs) return false;

  await admin.collection("notification_preferences").update(prefs.id, {
    applications_frequency: "never",
    company_digest_frequency: "never",
    profile_views_frequency: "never",
    profile_tips: false,
    marketing: false,
  });
  return true;
}

// GET: el link visible "Cancelar suscripción" dentro del email, clickeado
// por una persona -- redirige a una pantalla de confirmación.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (token) await unsubscribeAll(token).catch(() => {});
  return NextResponse.redirect(`${BASE_URL}/configuracion/notificaciones?unsubscribed=1`, { status: 302 });
}

// POST: el mecanismo de un click de List-Unsubscribe-Post (RFC 8058) -- lo
// dispara el propio cliente de mail (Gmail, etc.), no una persona, así que
// responde simple sin redirect/HTML.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (token) await unsubscribeAll(token).catch(() => {});
  return NextResponse.json({ ok: true });
}
