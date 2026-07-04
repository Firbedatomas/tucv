// Mismo lenguaje visual que components/admin/BreakdownList.tsx (barra +
// borde duro) pero con {label, value} genérico en vez del {name, visitors}
// específico de Plausible -- lib/admin/stats.ts ya devuelve las métricas de
// negocio en esta forma.
export function CategoryBreakdown({ rows, formatValue }: { rows: { label: string; value: number }[]; formatValue?: (n: number) => string }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
        Sin datos todavía.
      </p>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.value));
  const format = formatValue ?? ((n: number) => n.toLocaleString("es-AR"));

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const width = Math.max(4, Math.round((row.value / max) * 100));
        return (
          <div key={row.label}>
            <div className="flex items-baseline justify-between mb-0.5 text-sm">
              <span className="font-medium truncate pr-2" style={{ color: "var(--tucv-text)" }}>
                {row.label}
              </span>
              <span className="shrink-0" style={{ color: "var(--tucv-muted)" }}>
                {format(row.value)}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
            >
              <div className="h-full" style={{ width: `${width}%`, backgroundColor: "var(--tucv-primary)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
