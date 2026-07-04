import { NextResponse } from "next/server";
import { pbAdmin } from "@/lib/pocketbase-admin";

export const dynamic = "force-dynamic";

// Solo un conteo, nunca datos de postulantes reales -- lo que se necesita
// para que el mockup del hero muestre un número real en vez de inventado
// ("24 postulantes" hardcodeado), sin exponer perfiles ni nombres.
export async function GET() {
  try {
    const admin = await pbAdmin();
    const now = new Date().toISOString();
    const [jobs, candidates] = await Promise.all([
      admin.collection("job_posts").getList(1, 1, {
        filter: admin.filter("active = true && expires_at > {:now}", { now }),
        requestKey: null,
      }),
      admin.collection("candidate_profiles").getList(1, 1, {
        filter: "consent_zone_visible = true",
        requestKey: null,
      }),
    ]);
    return NextResponse.json({ activeJobs: jobs.totalItems, visibleCandidates: candidates.totalItems });
  } catch {
    return NextResponse.json({ activeJobs: 0, visibleCandidates: 0 }, { status: 200 });
  }
}
