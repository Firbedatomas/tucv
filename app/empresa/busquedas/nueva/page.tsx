"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { canManageJobs } from "@/lib/business-permissions";
import { JobPostForm } from "@/components/empresa/JobPostForm";
import { JobPostSellingPoints } from "@/components/empresa/JobPostSellingPoints";

export default function NuevaBusquedaPage() {
  const router = useRouter();
  // redirectIfLoggedOut:false a propósito -> el formulario se puede COMPLETAR
  // sin cuenta (fill-first). El login/registro se pide recién al "Publicar"
  // (ver JobPostForm.handleSubmit), y se vuelve acá con el draft intacto. Así
  // el CTA "Publicar búsqueda gratis" nunca pierde la intención ni termina en
  // un panel vacío.
  const { isAuthenticated, business, role } = useBusinessAuth({ redirectIfLoggedOut: false });

  // Un colaborador logueado que NO puede gestionar búsquedas (hoy solo el
  // dueño; ver canManageJobs) no tiene nada que hacer acá -> al panel. Un
  // visitante sin cuenta SÍ puede cargar (recién al publicar se le pide login).
  const isBlockedCollaborator = isAuthenticated && !!business && !!role && !canManageJobs(role);
  useEffect(() => {
    if (isBlockedCollaborator) router.replace("/empresa/panel");
  }, [isBlockedCollaborator, router]);

  if (isBlockedCollaborator) return null;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        <div className="max-w-lg lg:max-w-none">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Creá tu búsqueda</h1>
          <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
            Vas a recibir postulantes ordenados en tu panel, sin CVs sueltos por mail.
          </p>
          <JobPostForm
            // Sin negocio todavía (visitante fill-first): businessId vacío. El
            // submit detecta esto y manda a login antes de crear nada.
            businessId={business?.id ?? ""}
            businessName={business?.business_name ?? ""}
            businessPlan={business?.plan ?? "free"}
            // Vía el proxy same-origin (no la URL directa de pb.tucv.ar):
            // esa no tiene headers CORS y el <canvas> de la plantilla
            // imprimible no puede leerla sin eso.
            businessLogoUrl={business?.logoUrl ? `/api/business-logo/${business.id}` : null}
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
