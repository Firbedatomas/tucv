import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";

// Contador best-effort para el digest semanal (ver lib/email/templates/
// candidate-weekly-profile-views.ts) -- mismo criterio que /api/job-share:
// sin login, sin rate limit, read-then-write sin lock. El peor caso es
// perder algún +1 bajo tráfico simultáneo altísimo, algo que este mercado
// local no tiene hoy; no vale la pena una transacción real para un número
// que solo se usa como métrica de "tu perfil se movió esta semana".
export async function POST(req: Request) {
  const { slug } = await req.json().catch(() => ({ slug: null }));
  if (!slug) return NextResponse.json({ ok: true });

  try {
    const admin = await pbAdmin();
    const record = await admin
      .collection("candidate_profiles")
      .getFirstListItem(admin.filter("profile_slug = {:slug}", { slug }))
      .catch(() => null);
    if (!record) return NextResponse.json({ ok: true });

    await admin.collection("candidate_profiles").update(record.id, {
      profile_views_total: (record.profile_views_total ?? 0) + 1,
      profile_views_since_digest: (record.profile_views_since_digest ?? 0) + 1,
    });
  } catch {
    // Nunca debe romper la carga de la página por esto.
  }

  return NextResponse.json({ ok: true });
}
