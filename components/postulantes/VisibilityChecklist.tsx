"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type RichCategoryExperience = { category: string; experience: string };

// Checklist HONESTO de visibilidad para el DUEÑO del perfil. Espeja, en
// lenguaje para la persona, los mismos criterios con los que
// listPublicCandidates ordena el directorio (ver lib/public-candidates-list.ts):
// lo que marcamos como pendiente es exactamente lo que sube el orden. No es
// manipulador -- no promete "aparecés primero", solo dice qué queda por
// completar y por qué ayuda.
export function VisibilityChecklist({
  slug,
  categories,
  availability,
  bio,
  immediate_availability,
  category_experience,
}: {
  slug: string;
  categories: string[];
  availability: string[];
  bio: string;
  has_own_transport: string;
  immediate_availability: boolean;
  category_experience: RichCategoryExperience[];
}) {
  const [referencesTotal, setReferencesTotal] = useState<number | null>(null);
  const [recommendationsTotal, setRecommendationsTotal] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/references/public/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { total?: number } | null) => setReferencesTotal(d?.total ?? 0))
      .catch(() => setReferencesTotal(0));
    fetch(`/api/recommendations/public/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { total?: number } | null) => setRecommendationsTotal(d?.total ?? 0))
      .catch(() => setRecommendationsTotal(0));
  }, [slug]);

  const hasExperience = (category_experience ?? []).some(
    (e) => e.experience && e.experience !== "sin_experiencia",
  );
  const profileComplete =
    Boolean(bio.trim()) && categories.length > 0 && availability.length > 0 && hasExperience;

  // done === null -> todavía cargando (referencias/recomendaciones): mostramos
  // el ítem en estado neutro hasta saber, sin marcarlo como cumplido de más.
  const items: { label: string; help: string; done: boolean | null }[] = [
    {
      label: "Perfil completo",
      help: "Bio, rubros, disponibilidad y experiencia cargados.",
      done: profileComplete,
    },
    {
      label: "Disponible ahora",
      help: "Marcá que podés empezar ya si es tu caso.",
      done: immediate_availability,
    },
    {
      label: "Con experiencia",
      help: "Sumá experiencia en al menos un rubro.",
      done: hasExperience,
    },
    {
      label: "Sumá una referencia",
      help: "Alguien que trabajó con vos suma confianza.",
      done: referencesTotal === null ? null : referencesTotal > 0,
    },
    {
      label: "Pedí una recomendación",
      help: "Una recomendación pública refuerza tu perfil.",
      done: recommendationsTotal === null ? null : recommendationsTotal > 0,
    },
    {
      label: "Actualizá tu disponibilidad esta semana",
      help: "Los perfiles al día aparecen más arriba en el directorio.",
      done: false,
    },
  ];

  const doneCount = items.filter((i) => i.done === true).length;

  return (
    <Card className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="text-sm font-bold">Mejorá tu visibilidad</h2>
        <span className="text-xs font-semibold" style={{ color: "var(--tucv-muted)" }}>
          {doneCount} de {items.length}
        </span>
      </div>
      <p className="text-xs mb-4" style={{ color: "var(--tucv-muted)" }}>
        Cuanto más completo tu perfil, más arriba aparecés cuando un negocio busca gente.
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => {
          const done = item.done === true;
          return (
            <li key={item.label} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="text-base leading-5 shrink-0"
                style={{ color: done ? "#128C4A" : "var(--tucv-muted)" }}
              >
                {done ? "✓" : "□"}
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold leading-5"
                  style={done ? { color: "var(--tucv-muted)" } : undefined}
                >
                  {item.label}
                </p>
                {!done && (
                  <p className="text-xs leading-4 mt-0.5" style={{ color: "var(--tucv-muted)" }}>
                    {item.help}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
