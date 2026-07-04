import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  basePath,
  // Filtros activos (q, plan, etc) para no perderlos al cambiar de página --
  // sin esto, "Siguiente" volvía a la lista completa sin filtrar.
  queryString,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  queryString?: string;
}) {
  if (totalPages <= 1) return null;
  const prefix = queryString ? `${queryString}&` : "";

  return (
    <div className="flex items-center gap-3 mt-4 text-sm">
      <Link
        href={`${basePath}?${prefix}page=${Math.max(1, page - 1)}`}
        className="px-3 py-1.5 rounded-[var(--tucv-radius)]"
        style={{
          border: "2px solid var(--tucv-border)",
          opacity: page <= 1 ? 0.4 : 1,
          pointerEvents: page <= 1 ? "none" : "auto",
        }}
      >
        Anterior
      </Link>
      <span style={{ color: "var(--tucv-muted)" }}>
        Página {page} de {totalPages}
      </span>
      <Link
        href={`${basePath}?${prefix}page=${Math.min(totalPages, page + 1)}`}
        className="px-3 py-1.5 rounded-[var(--tucv-radius)]"
        style={{
          border: "2px solid var(--tucv-border)",
          opacity: page >= totalPages ? 0.4 : 1,
          pointerEvents: page >= totalPages ? "none" : "auto",
        }}
      >
        Siguiente
      </Link>
    </div>
  );
}
