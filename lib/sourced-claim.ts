import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { makeJobSlug, generateShortCode } from "@/lib/slug";

// Ascenso de una empresa detectada a una cuenta REAL cuando el dueño la reclama.
// Vincula el sourced_business a su business_accounts y convierte las búsquedas
// detectadas en job_posts en estado BORRADOR (status="draft", active=false): son
// búsquedas reales bajo su cuenta, pero NO se publican con los datos placeholder
// del scraping (category/shift genéricos) -- el dueño las completa y publica desde
// su panel con el flujo normal. La identidad/ownership se validan antes de llamar
// esto. Corre server-side con pbAdmin (las colecciones de siembra son null-rule).
export async function completeClaim(params: {
  sourcedBusinessId: string;
  businessAccountId: string;
  userId: string;
}): Promise<{ ok: boolean; ascended: number; error?: string }> {
  const admin = await pbAdmin();

  // Ownership: el business_accounts tiene que ser del usuario que reclama.
  const biz = await admin.collection("business_accounts").getOne(params.businessAccountId).catch(() => null);
  if (!biz || (biz.user as string) !== params.userId) return { ok: false, ascended: 0, error: "no-business" };

  const sourced = await admin.collection("sourced_businesses").getOne(params.sourcedBusinessId).catch(() => null);
  if (!sourced) return { ok: false, ascended: 0, error: "not-found" };
  if (sourced.claimed_business) return { ok: false, ascended: 0, error: "already-claimed" };

  await admin
    .collection("sourced_businesses")
    .update(params.sourcedBusinessId, { claimed_business: params.businessAccountId, status: "claimed" });

  const jobs = await admin
    .collection("sourced_jobs")
    .getFullList({
      filter: admin.filter("sourced_business = {:id} && status = {:s}", { id: params.sourcedBusinessId, s: "detected" }),
      requestKey: null,
    })
    .catch(() => []);

  const bizName = (biz.business_name as string) || (sourced.name as string) || "";
  let ascended = 0;
  for (const j of jobs) {
    const role = (j.role as string) || "Búsqueda";
    // Defaults genéricos a propósito: el dueño ajusta rubro/turno/experiencia al
    // completar el borrador. Nada se hace público hasta que él lo publique.
    const created = await admin
      .collection("job_posts")
      .create({
        business: params.businessAccountId,
        name: role,
        role,
        category: "otro",
        address_zone: (sourced.city_zone as string) || bizName || "-",
        shift: "full_time",
        experience_required: "sin_experiencia",
        duration_days: "7",
        slug: makeJobSlug(bizName || role, role),
        short_code: generateShortCode(),
        visible_message: (j.description_snippet as string) || "",
      })
      .catch(() => null);
    if (!created) continue;
    // El hook onRecordCreate fuerza active=true -> lo bajamos a borrador acá
    // (update con pbAdmin/superusuario, no lo revierte el hook de update).
    await admin.collection("job_posts").update(created.id, { active: false, status: "draft" }).catch(() => null);
    await admin.collection("sourced_jobs").update(j.id, { public_job: created.id, status: "claimed" }).catch(() => null);
    ascended += 1;
  }

  return { ok: true, ascended };
}
