import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { CATEGORIES, labelFor } from "@/lib/constants";
import { coarseLocality } from "@/lib/anonymize";

export const dynamic = "force-dynamic";

// Feed público ANONIMIZADO + contadores para el bloque "TuCV late ahora" de la
// landing (y base de la API pública, Fase 4). Nunca expone nombres de negocios,
// perfiles ni WhatsApp: solo rubro, zona y tipo de movimiento. Combina eventos
// públicos reales (activity_events) con movimiento derivado de las colecciones
// (búsquedas nuevas, perfiles recién visibles) para que el feed no dependa de
// que ya se hayan emitido eventos.
type FeedItem = { id: string; kind: string; text: string; zone: string; at: string };

function categoryLabel(cat: string): string {
  if (!cat) return "trabajo";
  return labelFor(CATEGORIES, cat) || cat;
}

export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get("city")?.trim() || "";
  try {
    const admin = await pbAdmin();
    const now = new Date().toISOString();
    const jobActive = admin.filter("active = true && expires_at > {:now}", { now });
    const cityJobs = city ? admin.filter(" && address_zone ~ {:c}", { c: city }) : "";
    const cityCands = city ? admin.filter(" && city_zone ~ {:c}", { c: city }) : "";
    const cityEvents = city ? admin.filter(" && (city ~ {:c} || zone ~ {:c})", { c: city }) : "";

    const [activeJobs, registered, visible, applications, recentJobs, recentCands, events] =
      await Promise.all([
        admin.collection("job_posts").getList(1, 1, { filter: jobActive + cityJobs, requestKey: null }),
        admin.collection("candidate_profiles").getList(1, 1, { requestKey: null }),
        admin
          .collection("candidate_profiles")
          .getList(1, 1, { filter: "consent_zone_visible = true" + cityCands, requestKey: null }),
        admin.collection("applications").getList(1, 1, { requestKey: null }),
        admin.collection("job_posts").getList(1, 8, {
          filter: jobActive + cityJobs,
          sort: "-created",
          fields: "id,category,address_zone,created",
          requestKey: null,
        }),
        admin.collection("candidate_profiles").getList(1, 8, {
          filter: "consent_zone_visible = true" + cityCands,
          sort: "-updated",
          fields: "id,categories,city_zone,updated",
          requestKey: null,
        }),
        admin.collection("activity_events").getList(1, 12, {
          filter: "visibility = \"public\"" + cityEvents,
          sort: "-created",
          fields: "id,type,zone,metadata,created",
          requestKey: null,
        }),
      ]);

    const items: FeedItem[] = [];

    for (const j of recentJobs.items) {
      items.push({
        id: `job_${j.id}`,
        kind: "job_created",
        text: `Nueva búsqueda de ${categoryLabel(j.category as string)}`,
        zone: coarseLocality(j.address_zone as string, true),
        at: j.created as string,
      });
    }
    for (const c of recentCands.items) {
      const cats = (c.categories as string[]) ?? [];
      items.push({
        id: `cand_${c.id}`,
        kind: "candidate_visible",
        text: cats[0] ? `Perfil visible de ${categoryLabel(cats[0])}` : "Nuevo perfil visible",
        zone: coarseLocality(c.city_zone as string, false),
        at: c.updated as string,
      });
    }
    for (const e of events.items) {
      const meta = (e.metadata as { category?: string }) ?? {};
      const type = e.type as string;
      const cat = categoryLabel(meta.category ?? "");
      // job_created / candidate_registered / public_enabled ya salen por los
      // items derivados (recentJobs / recentCands) -> no los duplicamos acá.
      let text: string | null = null;
      if (type === "job_shared") text = `Compartieron una búsqueda de ${cat}`;
      else if (type === "application_sent") text = `Nueva postulación en ${cat}`;
      else if (type === "profile_completed") text = `Nuevo perfil completo de ${cat}`;
      if (!text) continue;
      // La zona ya viene anonimizada desde el emisor (/api/activity, job-share).
      items.push({ id: `ev_${e.id}`, kind: type, text, zone: (e.zone as string) || "", at: e.created as string });
    }

    items.sort((a, b) => (a.at < b.at ? 1 : -1));

    return NextResponse.json({
      counters: {
        activeJobs: activeJobs.totalItems,
        registeredCandidates: registered.totalItems,
        visibleCandidates: visible.totalItems,
        applications: applications.totalItems,
      },
      feed: items.slice(0, 20),
    });
  } catch {
    return NextResponse.json(
      { counters: { activeJobs: 0, registeredCandidates: 0, visibleCandidates: 0, applications: 0 }, feed: [] },
      { status: 200 },
    );
  }
}
