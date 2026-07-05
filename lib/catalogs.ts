"use client";

import { pb } from "@/lib/pocketbase";

// Catálogos DB-driven (Fase 0): rubros, puestos, tareas. Lectura pública, así
// que el cliente los trae sin auth. Fase 3A los usa en el form de experiencias,
// SIEMPRE con opción de texto libre (si algo no está en el catálogo, el usuario
// lo escribe).
export type CatalogItem = { id: string; slug: string; label: string; category?: string };

export async function loadCatalog(name: "job_categories" | "job_roles" | "tasks"): Promise<CatalogItem[]> {
  try {
    const rows = await pb()
      .collection(name)
      .getFullList({ sort: "sort,label", requestKey: null });
    return rows
      .filter((r) => r.active !== false)
      .map((r) => ({ id: r.id as string, slug: r.slug as string, label: r.label as string, category: (r.category as string) || "" }));
  } catch {
    return [];
  }
}
