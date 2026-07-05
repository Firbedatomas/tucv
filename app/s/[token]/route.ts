import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { logActivity } from "@/lib/activity";
import { REF_COOKIE, REF_MAX_AGE_SECONDS } from "@/lib/attribution";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://tucv.ar";

// Puerta pública de un link compartido: /s/<token>. Cuenta el click, deja la
// cookie de atribución (tucv_ref) y redirige a la URL canónica de la entidad
// (/p/<slug> o /b/<slug>). Toda la lógica de conteo/atribución vive acá para
// que la URL que se comparte sea limpia y no dependa de query params que se
// pierden al recompartir. Si el token no existe -> a la home, sin romper.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  try {
    const admin = await pbAdmin();
    const link = await admin
      .collection("share_links")
      .getFirstListItem(admin.filter("token = {:token}", { token }), { requestKey: null })
      .catch(() => null);

    if (!link) {
      return NextResponse.redirect(new URL("/", BASE), 302);
    }

    // Resolvemos el slug de la entidad real. Si el perfil/búsqueda ya no existe
    // (borrado), caemos a la home en vez de a un 404.
    let dest = "/";
    if (link.entity_type === "profile") {
      const profile = await admin
        .collection("candidate_profiles")
        .getOne(String(link.entity_id), { fields: "profile_slug", requestKey: null })
        .catch(() => null);
      if (profile?.profile_slug) dest = `/p/${profile.profile_slug}`;
    } else if (link.entity_type === "job") {
      const job = await admin
        .collection("job_posts")
        .getOne(String(link.entity_id), { fields: "slug", requestKey: null })
        .catch(() => null);
      if (job?.slug) dest = `/b/${job.slug}`;
    }

    // Conteo + evento best-effort: nunca deben bloquear la redirección.
    await admin
      .collection("share_links")
      .update(String(link.id), { "clicks+": 1 }, { requestKey: null })
      .catch(() => {});
    await logActivity(admin, {
      type: "share_clicked",
      actorType: link.entity_type === "job" ? "company" : "candidate",
      visibility: "internal",
      metadata: { channel: link.channel, entity_type: link.entity_type },
    });

    const res = NextResponse.redirect(new URL(dest, BASE), 302);
    res.cookies.set(REF_COOKIE, token, {
      maxAge: REF_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL("/", BASE), 302);
  }
}
