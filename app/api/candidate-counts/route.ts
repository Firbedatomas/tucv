import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";
import {
  computeCandidateBreakdown,
  CANDIDATE_BREAKDOWN_FIELDS,
  type CandidateBreakdownInput,
} from "@/lib/candidate-stats";

export const dynamic = "force-dynamic";

// Desglose agregado de postulantes para el header de /empresa/candidatos.
// Solo conteos, nunca datos de perfiles -- por eso corre con pbAdmin en vez de
// depender de los listRule del cliente business (que solo ven consent_zone_visible).
// El total de registrados sirve de prueba social ("4 registrados en TuCV"),
// igual que hero-stats ya expone visibleCandidates públicamente.
export async function GET() {
  try {
    const admin = await pbAdmin();
    const candidates = await admin
      .collection("candidate_profiles")
      .getFullList<CandidateBreakdownInput>({ fields: CANDIDATE_BREAKDOWN_FIELDS, requestKey: null });
    const breakdown = computeCandidateBreakdown(candidates);
    return NextResponse.json(breakdown);
  } catch {
    return NextResponse.json(
      { total: 0, visiblesEmpresas: 0, perfilPublico: 0, incompletos: 0, ocultos: 0 },
      { status: 200 }
    );
  }
}
