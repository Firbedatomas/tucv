import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import { publicDisplayName } from "@/lib/candidate-visibility";

export const dynamic = "force-dynamic";

// Resumen público de recomendaciones: conteo agregado siempre; nombre (solo de
// pila + inicial) y texto solo de las aprobadas que aceptaron mostrar el
// nombre. Nunca email ni datos de contacto del recomendador.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empty = { total: 0, byRelation: {} as Record<string, number>, items: [] as unknown[] };
  try {
    const admin = await pbAdmin();
    const candidate = await admin
      .collection("candidate_profiles")
      .getFirstListItem(`profile_slug="${slug}"`, { fields: "id", requestKey: null })
      .catch(() => null);
    if (!candidate) return NextResponse.json(empty);

    const approved = await admin.collection("recommendations").getFullList({
      filter: `candidate="${candidate.id}" && status="approved"`,
      sort: "-created",
      requestKey: null,
    });

    const byRelation: Record<string, number> = {};
    for (const r of approved) {
      const rel = (r.relation as string) || "conocido";
      byRelation[rel] = (byRelation[rel] ?? 0) + 1;
    }
    const items = approved
      .filter((r) => r.show_name)
      .map((r) => ({
        id: r.id as string,
        name: publicDisplayName((r.recommender_name as string) || ""),
        relation: (r.relation as string) || "",
        text: (r.text as string) || "",
      }));

    return NextResponse.json({ total: approved.length, byRelation, items });
  } catch {
    return NextResponse.json(empty);
  }
}
