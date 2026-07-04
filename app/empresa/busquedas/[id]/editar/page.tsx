"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { JobPostForm, type JobPostFormMode } from "@/components/empresa/JobPostForm";
import type { ScreeningQuestion } from "@/lib/constants";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type JobRecord = {
  id: string;
  business: string;
  slug: string;
  status: string;
  active: boolean;
  category: string;
  category_other: string;
  address_zone: string;
  city?: string;
  province?: string;
  country?: string;
  role: string;
  main_tasks: string[] | null;
  shift: string[];
  experience_required: string;
  perks: string[] | null;
  visible_message: string;
  duration_days: string;
  schedule_details: string;
  vacancies: string;
  hard_requirements: string[] | null;
  salary_mode: string;
  salary_amount: string;
  screening_questions: ScreeningQuestion[] | null;
};

export default function EditarBusquedaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { isValid, business, role } = useBusinessAuth();
  const [state, setState] = useState<
    { status: "loading" } | { status: "not-found" } | { status: "ready"; job: JobRecord }
  >({ status: "loading" });

  useEffect(() => {
    if (isValid && role && role !== "owner") router.replace("/empresa/panel");
  }, [isValid, role, router]);

  useEffect(() => {
    if (!business) return;
    pb()
      .collection("job_posts")
      .getOne<JobRecord>(id, { requestKey: null })
      .then((job) => {
        if (job.business !== business.id) {
          setState({ status: "not-found" });
          return;
        }
        setState({ status: "ready", job });
      })
      .catch(() => setState({ status: "not-found" }));
  }, [id, business]);

  if (!isValid || role !== "owner") return null;

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <LinkButton href="/empresa/panel" variant="ghost" className="!px-0 !py-0 mb-4 text-sm">
          ← Volver a tus búsquedas
        </LinkButton>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Editar búsqueda</h1>
        {state.status === "ready" && state.job.status === "draft" && (
          <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
            Cambiá sueldo, zona, horario, requisitos, tareas o beneficios antes de publicarla.
          </p>
        )}

        {state.status === "loading" && (
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Cargando...
          </p>
        )}

        {state.status === "not-found" && (
          <Card className="text-center">
            <h2 className="font-bold mb-2">No encontramos esta búsqueda</h2>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              Puede que no exista o no te pertenezca.
            </p>
          </Card>
        )}

        {/* Solo se edita mientras sigue en borrador (nunca se publicó) --
            entrar acá directo por URL a una ya publicada no debe dejar
            cambiarla, aunque el link "Editar" ya no se muestre para esas
            desde el panel (ver JobPostCard.tsx). */}
        {state.status === "ready" && state.job.status !== "draft" && (
          <Card className="text-center">
            <h2 className="font-bold mb-2">Esta búsqueda ya está publicada</h2>
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              Una vez publicada no se puede editar, para no confundir a quien ya se postuló con el
              puesto original. Si necesitás cambiar algo, pausala desde el panel y duplicala para
              publicar una nueva.
            </p>
          </Card>
        )}

        {state.status === "ready" && state.job.status === "draft" && business && (
          <JobPostForm
            businessId={business.id}
            businessName={business.business_name}
            businessPlan={business.plan}
            businessLogoUrl={business.logoUrl ? `/api/business-logo/${business.id}` : null}
            mode={
              {
                kind: "edit",
                jobId: state.job.id,
                slug: state.job.slug,
                status: state.job.status,
                initialScheduleDetails: state.job.schedule_details ?? "",
              } satisfies JobPostFormMode
            }
            initialValues={{
              category: state.job.category,
              category_other: state.job.category_other ?? "",
              address_zone: state.job.address_zone,
              city: state.job.city ?? "",
              province: state.job.province ?? "",
              country: state.job.country ?? "",
              role: state.job.role,
              main_tasks: state.job.main_tasks ?? [],
              shift: state.job.shift ?? [],
              experience_required: state.job.experience_required,
              perks: state.job.perks ?? [],
              visible_message: state.job.visible_message ?? "",
              duration_days: state.job.duration_days ?? "30",
              schedule_days: "",
              schedule_hours: [],
              vacancies: state.job.vacancies ?? "",
              hard_requirements: state.job.hard_requirements ?? [],
              salary_mode: state.job.salary_mode ?? "",
              salary_amount: state.job.salary_amount ?? "",
              screening_questions: state.job.screening_questions ?? [],
            }}
          />
        )}
      </div>
    </main>
  );
}
