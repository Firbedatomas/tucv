import { pbAdmin } from "@/lib/pocketbase-admin";
import { StatCard } from "@/components/admin/StatCard";
import { CategoryBreakdown } from "@/components/admin/CategoryBreakdown";
import { DataTable } from "@/components/admin/DataTable";
import { Card } from "@/components/ui/Card";
import { CATEGORIES, labelFor } from "@/lib/constants";

export const dynamic = "force-dynamic";

// Argentina = UTC-3 fijo (sin horario de verano) -> alcanza para "hoy" sin
// depender de la timezone del contenedor (que corre en UTC). Mismo criterio
// que lib/admin/stats.ts.
function startOfTodayArgentinaISO(): string {
  const now = new Date();
  const arNow = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(arNow.getUTCFullYear(), arNow.getUTCMonth(), arNow.getUTCDate(), 3, 0, 0),
  ).toISOString();
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

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

function channelLabel(c: string): string {
  return CHANNEL_LABELS[c] ?? c;
}

function categoryLabel(cat: string): string {
  if (!cat) return "Sin rubro";
  return labelFor(CATEGORIES, cat) || cat;
}

type ShareLink = { entity_type: string; channel: string; clicks: number; created: string };
type MovementEvent = { candidate_id: string; zone: string; metadata: { category?: string } | null };

export default async function AdminViralidadPage() {
  const admin = await pbAdmin();
  const todayISO = startOfTodayArgentinaISO();
  const monthISO = daysAgoISO(30);

  // Conversiones atribuidas a un share (las emite el flujo de registro/
  // postulación al leer la cookie tucv_ref). Si todavía no se cableó ninguna,
  // las cuentas quedan en 0 -- no rompe.
  const [shareLinks, regFromShare, coFromShare, appFromShare, movement] = await Promise.all([
    admin.collection("share_links").getFullList<ShareLink>({
      fields: "entity_type,channel,clicks,created",
      requestKey: null,
    }).catch(() => [] as ShareLink[]),
    admin.collection("activity_events").getList(1, 1, {
      filter: admin.filter('type = "candidate_registered_from_share"', {}),
      requestKey: null,
    }).then((r) => r.totalItems).catch(() => 0),
    admin.collection("activity_events").getList(1, 1, {
      filter: admin.filter('type = "company_registered_from_share"', {}),
      requestKey: null,
    }).then((r) => r.totalItems).catch(() => 0),
    admin.collection("activity_events").getList(1, 1, {
      filter: admin.filter('type = "application_sent_from_share"', {}),
      requestKey: null,
    }).then((r) => r.totalItems).catch(() => 0),
    // Movimiento del último mes: eventos con perfil/zona/rubro asociados. Se
    // acota a 30 días para que "con más movimiento" signifique reciente y para
    // no traer todo el historial. Best-effort ante fromShareFilter no usado acá.
    admin.collection("activity_events").getFullList<MovementEvent>({
      filter: admin.filter("created >= {:since}", { since: monthISO }),
      fields: "candidate_id,zone,metadata",
      requestKey: null,
    }).catch(() => [] as MovementEvent[]),
  ]);

  // --- Shares (perfiles y búsquedas compartidos) ---
  let profilesTotal = 0;
  let profilesToday = 0;
  let jobsTotal = 0;
  let jobsToday = 0;
  let clicksTotal = 0;
  const clicksByChannel: Record<string, number> = {};
  const linksByChannel: Record<string, number> = {};
  for (const s of shareLinks) {
    const isToday = s.created >= todayISO;
    if (s.entity_type === "profile") {
      profilesTotal += 1;
      if (isToday) profilesToday += 1;
    } else if (s.entity_type === "job") {
      jobsTotal += 1;
      if (isToday) jobsToday += 1;
    }
    const clicks = s.clicks ?? 0;
    clicksTotal += clicks;
    clicksByChannel[s.channel] = (clicksByChannel[s.channel] ?? 0) + clicks;
    linksByChannel[s.channel] = (linksByChannel[s.channel] ?? 0) + 1;
  }

  const channelRows = Object.keys({ ...clicksByChannel, ...linksByChannel })
    .map((ch) => ({
      id: ch,
      canal: channelLabel(ch),
      links: linksByChannel[ch] ?? 0,
      clicks: clicksByChannel[ch] ?? 0,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.links - a.links);

  // --- Movimiento por perfil / zona / rubro (último mes) ---
  const byProfile: Record<string, number> = {};
  const byZone: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  for (const e of movement) {
    if (e.candidate_id) byProfile[e.candidate_id] = (byProfile[e.candidate_id] ?? 0) + 1;
    const zone = e.zone?.trim();
    if (zone) byZone[zone] = (byZone[zone] ?? 0) + 1;
    const cat = e.metadata?.category;
    if (cat) byCategory[cat] = (byCategory[cat] ?? 0) + 1;
  }

  const topProfileIds = Object.entries(byProfile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  // Resolver nombres solo de los 10 perfiles más activos (no de todos).
  const profileNameById = new Map<string, string>();
  if (topProfileIds.length > 0) {
    const orFilter = topProfileIds.map((_, i) => `id = {:p${i}}`).join(" || ");
    const params = Object.fromEntries(topProfileIds.map((id, i) => [`p${i}`, id]));
    const profiles = await admin
      .collection("candidate_profiles")
      .getFullList<{ id: string; name: string }>({
        filter: admin.filter(orFilter, params),
        fields: "id,name",
        requestKey: null,
      })
      .catch(() => [] as { id: string; name: string }[]);
    for (const p of profiles) profileNameById.set(p.id, p.name);
  }

  const topProfileRows = topProfileIds.map((id) => ({
    id,
    perfil: profileNameById.get(id) || "Perfil sin nombre",
    eventos: byProfile[id],
  }));

  const zoneRows = Object.entries(byZone)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const categoryRows = Object.entries(byCategory)
    .map(([key, value]) => ({ label: categoryLabel(key), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const conversionsTotal = regFromShare + coFromShare + appFromShare;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Viralidad TuCV</h1>
        <p className="text-sm mt-1" style={{ color: "var(--tucv-muted)" }}>
          Medir para saber qué funciona: qué se comparte, por qué canal, y qué trae vida real
          (registros y postulaciones).
        </p>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Hoy
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Perfiles compartidos" value={profilesToday} />
        <StatCard label="Búsquedas compartidas" value={jobsToday} />
        <StatCard label="Perfiles compartidos (total)" value={profilesTotal} />
        <StatCard label="Búsquedas compartidas (total)" value={jobsTotal} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Conversiones atribuidas a shares
      </p>
      <p className="text-sm mb-3" style={{ color: "var(--tucv-muted)" }}>
        Registros y postulaciones de gente que llegó por un link compartido (cookie de atribución,
        ventana de 7 días). En 0 hasta que empiece a haber conversiones atribuidas.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total originado por shares" value={conversionsTotal} />
        <StatCard label="Postulantes" value={regFromShare} />
        <StatCard label="Empresas" value={coFromShare} />
        <StatCard label="Postulaciones" value={appFromShare} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Clicks por canal
      </p>
      <p className="text-sm mb-3" style={{ color: "var(--tucv-muted)" }}>
        {clicksTotal.toLocaleString("es-AR")} clicks en total sobre {shareLinks.length.toLocaleString("es-AR")}{" "}
        links compartidos.
      </p>
      <div className="mb-8">
        <DataTable
          rows={channelRows}
          emptyLabel="Todavía nadie compartió nada."
          columns={[
            { key: "canal", label: "Canal" },
            { key: "links", label: "Links", align: "right" },
            { key: "clicks", label: "Clicks", align: "right" },
          ]}
        />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--tucv-muted)" }}>
        Movimiento del último mes
      </p>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <h2 className="font-semibold mb-3">Perfiles con más movimiento</h2>
          <DataTable
            rows={topProfileRows}
            emptyLabel="Sin movimiento por perfil todavía."
            columns={[
              { key: "perfil", label: "Perfil" },
              { key: "eventos", label: "Eventos", align: "right" },
            ]}
          />
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">Zonas con más movimiento</h2>
          <CategoryBreakdown rows={zoneRows} />
        </Card>
        <Card>
          <h2 className="font-semibold mb-3">Rubros con más movimiento</h2>
          <CategoryBreakdown rows={categoryRows} />
        </Card>
      </div>
    </div>
  );
}
