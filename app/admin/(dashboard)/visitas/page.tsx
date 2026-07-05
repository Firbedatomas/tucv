import { getVisitStats, getVisitsTimeseries, getBreakdown, isPlausibleConfigured } from "@/lib/admin/plausible";
import { StatCard } from "@/components/admin/StatCard";
import { VisitsChart } from "@/components/admin/VisitsChart";
import { BreakdownList } from "@/components/admin/BreakdownList";
import { Card } from "@/components/ui/Card";
import { getTheme } from "@/lib/theme/tokens";

export default async function AdminVisitasPage() {
  const configured = isPlausibleConfigured();
  const [stats, series, sources, devices, countries] = configured
    ? await Promise.all([
        getVisitStats("30d"),
        getVisitsTimeseries("30d"),
        getBreakdown("visit:source", "30d"),
        getBreakdown("visit:device", "30d"),
        getBreakdown("visit:country", "30d"),
      ])
    : [null, null, null, null, null];
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
          <Card className="mb-6">
            <VisitsChart
              data={series}
              primaryColor={theme.colors.primary}
              accentColor={theme.colors.accent}
              borderColor={theme.colors.border}
            />
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <h2 className="font-semibold mb-3">De dónde vienen</h2>
              {sources ? <BreakdownList rows={sources} /> : (
                <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>No pudimos consultar esto.</p>
              )}
            </Card>
            <Card>
              <h2 className="font-semibold mb-3">Dispositivo</h2>
              {devices ? <BreakdownList rows={devices} /> : (
                <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>No pudimos consultar esto.</p>
              )}
            </Card>
            <Card>
              <h2 className="font-semibold mb-3">País</h2>
              {countries ? <BreakdownList rows={countries} /> : (
                <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>No pudimos consultar esto.</p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
