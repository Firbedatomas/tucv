import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";

export const dynamic = "force-dynamic";

// Resumen SEGURO de referencias para el perfil público. Regla del spec:
// - El conteo agregado (total + por relación) incluye todas las APROBADAS.
// - El nombre/empresa/texto solo se muestran si además la referencia aceptó
//   visibilidad pública (show_name). Las privadas suman al contador y nada más.
// - Si el candidato desactivó show_references, no se muestra nada.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const empty = { total: 0, byRelation: {} as Record<string, number>, items: [] as unknown[] };
  try {
    const admin = await pbAdmin();
    const candidate = await admin
      .collection("candidate_profiles")
      .getFirstListItem(`profile_slug="${slug}"`, { fields: "id,show_references", requestKey: null })
      .catch(() => null);
    if (!candidate || candidate.show_references === false) return NextResponse.json(empty);

    const approved = await admin.collection("candidate_references").getFullList({
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
        name: (r.referrer_name as string) || "",
        relation: (r.relation as string) || "",
        company: (r.company as string) || "",
        text: (r.text as string) || "",
      }));

    return NextResponse.json({ total: approved.length, byRelation, items });
  } catch {
    return NextResponse.json(empty);
  }
}
