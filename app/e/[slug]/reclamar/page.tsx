import { notFound } from "next/navigation";
import { getSourcedBusinessBySlug } from "@/lib/sourced";
import { ClaimBusiness } from "@/components/sourced/ClaimBusiness";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { robots: { index: false, follow: false } };

export default async function ClaimPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const biz = await getSourcedBusinessBySlug(slug);
  if (!biz) notFound();

  return (
    <main className="flex-1 px-4 py-8 sm:py-12">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-1">Reclamá tu empresa</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Estás por reclamar <strong>{biz.name}</strong>
          {biz.cityZone ? ` (${biz.cityZone})` : ""} y tomar el control de su página en TuCV, gratis.
        </p>

        {biz.claimed ? (
          <div
            className="rounded-[var(--tucv-radius)] px-4 py-4 text-sm"
            style={{ backgroundColor: "#E4F2E9", color: "#12854A", border: "1.5px solid #12854A" }}
          >
            <p className="font-semibold mb-2">Esta empresa ya está reclamada.</p>
            <LinkButton href="/empresa/panel">Ir a mi panel</LinkButton>
          </div>
        ) : (
          <ClaimBusiness sourcedId={biz.id} name={biz.name} cityZone={biz.cityZone} jobCount={biz.jobs.length} />
        )}
      </div>
    </main>
  );
}
