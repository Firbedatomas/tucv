"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { JobPostForm } from "@/components/empresa/JobPostForm";
import { JobPostSellingPoints } from "@/components/empresa/JobPostSellingPoints";

export default function NuevaBusquedaPage() {
  const router = useRouter();
  const { isValid, business, role } = useBusinessAuth();

  // Crear/editar búsquedas es exclusivo del dueño -- un colaborador (viewer)
  // que llegue directo a esta URL no puede hacer nada útil acá (la regla de
  // PocketBase igual rechazaría el create), mejor mandarlo de vuelta.
  useEffect(() => {
    if (isValid && role && role !== "owner") router.replace("/empresa/panel");
  }, [isValid, role, router]);

  if (!isValid || !business || role !== "owner") return null;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        <div className="max-w-lg lg:max-w-none">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Creá tu búsqueda</h1>
          <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
            Vas a recibir postulantes ordenados en tu panel, sin CVs sueltos por mail.
          </p>
          <JobPostForm
            businessId={business.id}
            businessName={business.business_name}
            businessPlan={business.plan}
            // Vía el proxy same-origin (no la URL directa de pb.tucv.ar):
            // esa no tiene headers CORS y el <canvas> de la plantilla
            // imprimible no puede leerla sin eso.
            businessLogoUrl={business.logoUrl ? `/api/business-logo/${business.id}` : null}
          />
        </div>

        {/* En mobile queda debajo del form (orden natural del grid de una
            sola columna); en desktop (lg:) es una columna aparte, pegada
            arriba mientras se scrollea el form largo. */}
        <div className="lg:sticky lg:top-20">
          <JobPostSellingPoints />
        </div>
      </div>
    </main>
  );
}
