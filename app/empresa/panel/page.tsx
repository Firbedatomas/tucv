"use client";

import { useBusinessAuth } from "@/lib/use-business-auth";
import { canManageJobs, canSourceCandidates } from "@/lib/business-permissions";
import { JobPostList } from "@/components/empresa/JobPostList";
import { ExportApplicationsButton } from "@/components/empresa/ExportApplicationsButton";
import { ReputationCard } from "@/components/empresa/ReputationCard";
import { NewCandidatesBanner } from "@/components/empresa/NewCandidatesBanner";
import { DetectedInterestBanner } from "@/components/empresa/DetectedInterestBanner";
import { LinkButton } from "@/components/ui/Button";

export default function PanelEmpresaPage() {
  const { isValid, business, role } = useBusinessAuth();

  if (!isValid) return null;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {business ? `Hola, ${business.business_name}` : "Tus búsquedas"}
              </h1>
              {business && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-[var(--tucv-radius)]"
                  style={
                    business.plan !== "free"
                      ? { backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }
                      : { backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)", border: "1.5px solid var(--tucv-border)" }
                  }
                >
                  Plan{" "}
                  {business.plan === "pro" ? "Pro" : business.plan === "multi_local" ? "Equipo" : "gratis"}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              Postulantes ordenados, sin CVs sueltos por mail.
            </p>
          </div>
          {(canManageJobs(role) || canSourceCandidates(role)) && (
            <div className="flex gap-3">
              {canManageJobs(role) && <LinkButton href="/empresa/busquedas/nueva">Crear búsqueda</LinkButton>}
              {canSourceCandidates(role) && (
                <LinkButton href="/empresa/candidatos" variant="secondary">
                  Buscar candidatos
                </LinkButton>
              )}
              {canManageJobs(role) && <ExportApplicationsButton />}
            </div>
          )}
        </div>
        {canManageJobs(role) && <DetectedInterestBanner />}
        {canSourceCandidates(role) && <NewCandidatesBanner />}
        {canManageJobs(role) && <ReputationCard />}
        <JobPostList
          businessId={business?.id ?? null}
          businessPlan={business?.plan ?? "free"}
          businessName={business?.business_name}
          businessLogoUrl={business?.logoUrl ? `/api/business-logo/${business.id}` : null}
          readOnly={!canManageJobs(role)}
        />
      </div>
    </main>
  );
}
