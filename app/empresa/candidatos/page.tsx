"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { canSourceCandidates } from "@/lib/business-permissions";
import { CandidateSearch } from "@/components/empresa/CandidateSearch";
import { LiveActivity } from "@/components/landing/LiveActivity";

export default function CandidatosPage() {
  const router = useRouter();
  const { isValid, business, role } = useBusinessAuth();

  // Búsqueda proactiva de candidatos es un uso a nivel negocio, para dueño y
  // admin -- no entra en el alcance de "revisar postulantes" de un reviewer
  // (ver lib/business-permissions.ts).
  useEffect(() => {
    if (isValid && role && !canSourceCandidates(role)) router.replace("/empresa/panel");
  }, [isValid, role, router]);

  if (!isValid || !business || !canSourceCandidates(role)) return null;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Buscar candidatos</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Perfiles de tu zona que eligieron ser visibles para negocios, aunque no se hayan
          postulado a ninguna de tus búsquedas.
        </p>
        <LiveActivity city={business.city} title="Tu zona está empezando a moverse" plan={business.plan} />
        <div id="candidatos" className="mt-6 scroll-mt-4">
          <CandidateSearch
            businessId={business.id}
            businessCity={business.city}
            businessProvince={business.province}
          />
        </div>
      </div>
    </main>
  );
}
