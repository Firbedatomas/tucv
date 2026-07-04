export type DataTableColumn<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyLabel = "Sin datos todavía.",
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div
        className="rounded-[var(--tucv-radius)] p-6 text-sm"
        style={{ border: "2px solid var(--tucv-border)", color: "var(--tucv-muted)" }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-[var(--tucv-radius)]"
      style={{ border: "2px solid var(--tucv-border)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "var(--tucv-bg)", borderBottom: "2px solid var(--tucv-border)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-2.5 font-semibold whitespace-nowrap"
                style={{ textAlign: col.align ?? "left", color: "var(--tucv-text)" }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} style={i > 0 ? { borderTop: "1px solid var(--tucv-border)" } : undefined}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-2.5 whitespace-nowrap"
                  style={{ textAlign: col.align ?? "left" }}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
