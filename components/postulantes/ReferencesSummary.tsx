"use client";

import { useEffect, useState } from "react";
import { relationLabel } from "@/lib/references";
import { ReportContentButton } from "@/components/postulantes/ReportContentButton";

type Summary = {
  total: number;
  byRelation: Record<string, number>;
  items: { id: string; name: string; relation: string; company: string; text: string }[];
};

// Bloque PÚBLICO de referencias en el perfil. Muestra el resumen agregado
// (total + por relación) y, solo de las que aceptaron visibilidad, el nombre y
// el texto. Nunca datos de contacto del referente.
export function ReferencesSummary({ slug }: { slug: string }) {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`/api/references/public/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Summary | null) => setData(d))
      .catch(() => {});
  }, [slug]);

  if (!data || data.total === 0) return null;

  const relationParts = Object.entries(data.byRelation).map(
    ([rel, n]) => `${n} ${relationLabel(rel).toLowerCase()}`,
  );

  return (
    <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--tucv-border)" }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--tucv-muted)" }}>
        Referencias
      </p>
      <p className="text-sm font-semibold mb-2">
        {data.total} referencia{data.total === 1 ? "" : "s"} verificada{data.total === 1 ? "" : "s"}
        {relationParts.length > 0 ? ` · ${relationParts.join(" · ")}` : ""}
      </p>
      <div className="space-y-2">
        {data.items.map((it, i) => (
          <div key={it.id || i} className="p-3 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-bg)", border: "1px solid var(--tucv-border)" }}>
            <p className="text-sm" style={{ color: "var(--tucv-text)" }}>
              “{it.text}”
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--tucv-muted)" }}>
              — {it.name}
              {it.relation ? `, ${relationLabel(it.relation).toLowerCase()}` : ""}
              {it.company ? ` en ${it.company}` : ""}
            </p>
            <div className="mt-1">
              <ReportContentButton contentType="reference" contentId={it.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
