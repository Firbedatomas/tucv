import { NextResponse } from "next/server";
import "server-only";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { resolveOwnerBusiness } from "@/lib/business-session";

export const dynamic = "force-dynamic";

// Métricas propias de la empresa dueña del token para /empresa/actividad. Solo
// datos reales de sus avisos y su mini-CRM. Resiliente a colecciones vacías.

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  x: "X",
  instagram: "Instagram",
  copy: "Copiar link",
  qr: "QR",
  poster: "Afiche",
  widget: "Widget",
  rss: "RSS",
  api: "API",
};

function weekAgoISO(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

type Job = {
  id: string;
  name: string;
  active: boolean;
  views: number;
  share_counts: { whatsapp?: number; x?: number; instagram?: number } | null;
};
type ShareLink = { entity_id: string; channel: string; clicks: number; created: string };
type Application = { job_post: string; created: string };

function shareCountTotal(sc: Job["share_counts"]): number {
  if (!sc) return 0;
  return (sc.whatsapp ?? 0) + (sc.x ?? 0) + (sc.instagram ?? 0);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const token = body?.token ?? null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let businessId: string;
  try {
    const business = await resolveOwnerBusiness(token);
    businessId = business.id;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = await pbAdmin();
    const weekISO = weekAgoISO();

    const jobs = await admin
      .collection("job_posts")
      .getFullList<Job>({
        filter: admin.filter("business = {:b}", { b: businessId }),
        fields: "id,name,active,views,share_counts",
        requestKey: null,
      })
      .catch(() => [] as Job[]);

    const jobIds = jobs.map((j) => j.id);

    // share_links y applications se filtran por los ids de los avisos de esta
    // empresa (entity_id / job_post son TEXTO). Sin avisos -> nada que traer.
    const jobOrFilter =
      jobIds.length > 0 ? jobIds.map((_, i) => `entity_id = {:j${i}}`).join(" || ") : "";
    const appOrFilter =
      jobIds.length > 0 ? jobIds.map((_, i) => `job_post = {:j${i}}`).join(" || ") : "";
    const jobParams = Object.fromEntries(jobIds.map((id, i) => [`j${i}`, id]));

    const [shareLinks, applications, savedTotal, savedWeek] = await Promise.all([
      jobIds.length > 0
        ? admin
            .collection("share_links")
            .getFullList<ShareLink>({
              filter: admin.filter(`entity_type = "job" && (${jobOrFilter})`, jobParams),
              fields: "entity_id,channel,clicks,created",
              requestKey: null,
            })
            .catch(() => [] as ShareLink[])
        : Promise.resolve([] as ShareLink[]),
      jobIds.length > 0
        ? admin
            .collection("applications")
            .getFullList<Application>({
              filter: admin.filter(appOrFilter, jobParams),
              fields: "job_post,created",
              requestKey: null,
            })
            .catch(() => [] as Application[])
        : Promise.resolve([] as Application[]),
      admin.collection("saved_candidates").getList(1, 1, {
        filter: admin.filter("business = {:b}", { b: businessId }),
        requestKey: null,
      }).then((r) => r.totalItems).catch(() => 0),
      admin.collection("saved_candidates").getList(1, 1, {
        filter: admin.filter("business = {:b} && created >= {:w}", { b: businessId, w: weekISO }),
        requestKey: null,
      }).then((r) => r.totalItems).catch(() => 0),
    ]);

    // Totales de avisos.
    let viewsTotal = 0;
    let sharesTotal = 0; // desde share_counts (contador legacy en el aviso)
    const activeJobs = jobs.filter((j) => j.active).length;
    for (const j of jobs) {
      viewsTotal += j.views ?? 0;
      sharesTotal += shareCountTotal(j.share_counts);
    }

    // Clicks por canal desde share_links (atribución nueva por QR/link).
    let clicksTotal = 0;
    const clicksByChannel: Record<string, number> = {};
    const linksByChannel: Record<string, number> = {};
    for (const s of shareLinks) {
      clicksTotal += s.clicks ?? 0;
      clicksByChannel[s.channel] = (clicksByChannel[s.channel] ?? 0) + (s.clicks ?? 0);
      linksByChannel[s.channel] = (linksByChannel[s.channel] ?? 0) + 1;
    }
    const channels = Object.keys({ ...clicksByChannel, ...linksByChannel })
      .map((ch) => ({
        channel: CHANNEL_LABELS[ch] ?? ch,
        links: linksByChannel[ch] ?? 0,
        clicks: clicksByChannel[ch] ?? 0,
      }))
      .sort((a, b) => b.clicks - a.clicks || b.links - a.links);

    // Postulaciones: total, esta semana, y por aviso.
    const appsByJob: Record<string, number> = {};
    let appsWeek = 0;
    for (const a of applications) {
      appsByJob[a.job_post] = (appsByJob[a.job_post] ?? 0) + 1;
      if (a.created >= weekISO) appsWeek += 1;
    }

    // Tabla por aviso: vistas, veces compartido y postulaciones.
    const perJob = jobs
      .map((j) => ({
        id: j.id,
        name: j.name || "Sin título",
        active: j.active,
        views: j.views ?? 0,
        shares: shareCountTotal(j.share_counts),
        applications: appsByJob[j.id] ?? 0,
      }))
      .sort((a, b) => b.views - a.views || b.applications - a.applications);

    return NextResponse.json({
      jobs: { total: jobs.length, active: activeJobs },
      views: { total: viewsTotal },
      shares: { fromCounters: sharesTotal, links: shareLinks.length, clicks: clicksTotal },
      channels,
      applications: { total: applications.length, thisWeek: appsWeek },
      savedCandidates: { total: savedTotal, thisWeek: savedWeek },
      perJob,
    });
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
