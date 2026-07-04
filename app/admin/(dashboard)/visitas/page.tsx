import { getVisitStats, getVisitsTimeseries, isPlausibleConfigured } from "@/lib/admin/plausible";
import { StatCard } from "@/components/admin/StatCard";
import { VisitsChart } from "@/components/admin/VisitsChart";
import { Card } from "@/components/ui/Card";
import { getTheme } from "@/lib/theme/tokens";

export default async function AdminVisitasPage() {
  const configured = isPlausibleConfigured();
  const [stats, series] = configured
    ? await Promise.all([getVisitStats("30d"), getVisitsTimeseries("30d")])
    : [null, null];
  const theme = getTheme("impacto");

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Visitas</h1>
      <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
        Últimos 30 días, vía Plausible (analytics.tucv.ar).
      </p>

      {!configured && (
        <Card>
          <p className="text-sm">
            Falta configurar <code>PLAUSIBLE_API_KEY</code> para ver estos datos. Se genera en
            analytics.tucv.ar → Settings → API Keys.
          </p>
        </Card>
      )}

      {configured && (!stats || !series) && (
        <Card>
          <p className="text-sm">No pudimos consultar Plausible ahora mismo. Probá de nuevo en un rato.</p>
        </Card>
      )}

      {stats && series && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <StatCard label="Visitantes" value={stats.visitors} />
            <StatCard label="Pageviews" value={stats.pageviews} />
            <StatCard
              label="Rebote"
              value={stats.bounceRate !== null ? `${Math.round(stats.bounceRate)}%` : "—"}
            />
          </div>
          <Card>
            <VisitsChart
              data={series}
              primaryColor={theme.colors.primary}
              accentColor={theme.colors.accent}
              borderColor={theme.colors.border}
            />
          </Card>
        </>
      )}
    </div>
  );
}
