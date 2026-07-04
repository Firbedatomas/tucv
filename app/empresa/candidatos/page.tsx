"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { CandidateSearch } from "@/components/empresa/CandidateSearch";

export default function CandidatosPage() {
  const router = useRouter();
  const { isValid, business, role } = useBusinessAuth();

  // Búsqueda proactiva de candidatos es un uso a nivel negocio (no está en
  // el alcance de "revisar búsquedas y postulantes" de un colaborador
  // invitado) -- ver TeamSection.tsx / lib/business-access.ts.
  useEffect(() => {
    if (isValid && role && role !== "owner") router.replace("/empresa/panel");
  }, [isValid, role, router]);

  if (!isValid || !business || role !== "owner") return null;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Buscar candidatos</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Perfiles de tu zona que eligieron ser visibles para negocios, aunque no se hayan
          postulado a ninguna de tus búsquedas.
        </p>
        <CandidateSearch businessId={business.id} />
      </div>
    </main>
  );
}
