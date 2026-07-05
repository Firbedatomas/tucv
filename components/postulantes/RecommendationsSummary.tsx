"use client";

import { useEffect, useState } from "react";
import { relationLabel } from "@/lib/references";
import { ReportContentButton } from "@/components/postulantes/ReportContentButton";

type Summary = {
  total: number;
  byRelation: Record<string, number>;
  items: { id: string; name: string; relation: string; text: string }[];
};

// Bloque público: conteo agregado de recomendaciones + nombre/texto solo de las
// aprobadas que aceptaron mostrar el nombre.
export function RecommendationsSummary({ slug }: { slug: string }) {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`/api/recommendations/public/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Summary | null) => setData(d))
      .catch(() => {});
  }, [slug]);

  if (!data || data.total === 0) return null;

  return (
    <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--tucv-border)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Recomendaciones
      </p>
      <p className="text-sm font-semibold mb-2">
        {data.total} {data.total === 1 ? "persona recomienda" : "personas recomiendan"} este perfil
      </p>
      <div className="space-y-2">
        {data.items
          .filter((it) => it.text)
          .map((it, i) => (
            <div key={it.id || i} className="p-3 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-bg)", border: "1px solid var(--tucv-border)" }}>
              <p className="text-sm" style={{ color: "var(--tucv-text)" }}>
                “{it.text}”
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
                — {it.name}
                {it.relation ? `, ${relationLabel(it.relation).toLowerCase()}` : ""}
              </p>
              <div className="mt-1">
                <ReportContentButton contentType="recommendation" contentId={it.id} />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
