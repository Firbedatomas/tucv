import type { BreakdownRow } from "@/lib/admin/plausible";

// Mismo lenguaje visual que FunnelBar (barra de fondo + borde duro) pero
// para un ranking en vez de un embudo secuencial -- cada fila es
// independiente, no hay drop-off entre una y otra.
export function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
        Sin datos en este período.
      </p>
    );
  }
  const max = Math.max(1, ...rows.map((r) => r.visitors));

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const width = Math.max(4, Math.round((row.visitors / max) * 100));
        return (
          <div key={row.name}>
            <div className="flex items-baseline justify-between mb-0.5 text-sm">
              <span className="font-medium truncate pr-2" style={{ color: "var(--tucv-text)" }}>
                {row.name}
              </span>
              <span className="shrink-0" style={{ color: "var(--tucv-muted)" }}>
                {row.visitors.toLocaleString("es-AR")}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
            >
              <div className="h-full" style={{ width: `${width}%`, backgroundColor: "var(--tucv-accent)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
