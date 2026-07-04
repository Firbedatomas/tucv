import { getDashboardStats } from "@/lib/admin/stats";
import { StatCard } from "@/components/admin/StatCard";

function formatARS(amount: number): string {
  return amount.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

export default async function AdminResumenPage() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Resumen</h1>

      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Hoy
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Negocios nuevos" value={stats.negocios.hoy} />
        <StatCard label="Postulantes nuevos" value={stats.postulantes.hoy} />
        <StatCard label="Postulaciones" value={stats.postulaciones.hoy} />
        <StatCard
          label="Pagos aprobados"
          value={stats.pagos.cantidadHoy}
          hint={stats.pagos.hoyAprobado > 0 ? formatARS(stats.pagos.hoyAprobado) : undefined}
        />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Totales
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Negocios registrados" value={stats.negocios.total} />
        <StatCard label="Postulantes registrados" value={stats.postulantes.total} />
        <StatCard label="Postulaciones" value={stats.postulaciones.total} />
        <StatCard label="Avisos activos" value={stats.avisosActivos} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mt-8 mb-1" style={{ color: "var(--tucv-muted)" }}>
        Postulantes por estado
      </p>
      <p className="text-sm mb-3" style={{ color: "var(--tucv-muted)" }}>
        De los {stats.postulantes.total} registrados, solo los visibles para empresas aparecen en{" "}
        <span className="font-semibold" style={{ color: "var(--tucv-text)" }}>/empresa/candidatos</span>. Son ejes
        independientes: un perfil puede estar oculto y además incompleto.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Visibles para empresas" value={stats.postulantes.visiblesEmpresas} />
        <StatCard label="Perfil público" value={stats.postulantes.perfilPublico} />
        <StatCard label="Incompletos" value={stats.postulantes.incompletos} />
        <StatCard label="Ocultos" value={stats.postulantes.ocultos} />
      </div>

      <p className="text-xs font-semibold uppercase tracking-wide mt-8 mb-2" style={{ color: "var(--tucv-muted)" }}>
        Ingresos aprobados (total histórico)
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total" value={formatARS(stats.pagos.totalAprobado)} />
        {Object.entries(stats.pagos.porTipo).map(([type, amount]) => (
          <StatCard key={type} label={type} value={formatARS(amount)} />
        ))}
      </div>
    </div>
  );
}
