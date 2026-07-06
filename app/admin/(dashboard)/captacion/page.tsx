import { pbAdmin } from "@/lib/pocketbase-admin";
import { SourcedManager, type SourcedRow } from "@/components/admin/SourcedManager";

// Panel de captación: sembrar empresas detectadas (piloto Córdoba), ver el
// interés real de candidatos por cada una (el gancho de outreach) y disparar el
// contacto. Todo vía pbAdmin server-side (las colecciones de siembra son null-rule).
export default async function AdminCaptacionPage() {
  const admin = await pbAdmin();
  const [businesses, jobs, interests] = await Promise.all([
    admin.collection("sourced_businesses").getFullList({ sort: "-created", requestKey: null }).catch(() => []),
    admin.collection("sourced_jobs").getFullList({ requestKey: null }).catch(() => []),
    admin.collection("candidate_interest").getFullList({ requestKey: null }).catch(() => []),
  ]);

  const interestByJob = new Map<string, number>();
  for (const i of interests) {
    const j = i.sourced_job as string;
    interestByJob.set(j, (interestByJob.get(j) ?? 0) + 1);
  }

  const rows: SourcedRow[] = businesses.map((b) => {
    const bizJobs = jobs.filter((j) => (j.sourced_business as string) === b.id);
    const interestCount = bizJobs.reduce((s, j) => s + (interestByJob.get(j.id) ?? 0), 0);
    return {
      id: b.id,
      name: b.name as string,
      cityZone: (b.city_zone as string) || "",
      slug: (b.public_slug as string) || "",
      status: (b.status as string) || "detected",
      sourceType: (b.source_type as string) || "",
      contactPhone: (b.contact_phone as string) || "",
      contactEmail: (b.contact_email as string) || "",
      instagram: (b.instagram as string) || "",
      jobCount: bizJobs.length,
      interestCount,
      roleExample: (bizJobs[0]?.role as string) || "",
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Captación de empresas</h1>
      <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
        Piloto Córdoba. Sembrá empresas detectadas públicamente, mirá cuántos candidatos ya se
        interesaron, y contactalas con ese gancho.
      </p>
      <SourcedManager rows={rows} />
    </div>
  );
}
