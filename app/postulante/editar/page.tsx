"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import {
  CandidateForm,
  type CandidateFormValues,
} from "@/components/postulante/CandidateForm";
import { emptyCategoryWork, type CategoryWorkValue } from "@/components/postulante/CategoryWorkEntry";
import { type StudyLevelValue } from "@/components/postulante/StudyLevelEntry";
import { type ReferenceValue } from "@/components/postulante/ReferenceListInput";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { DataRightsCard } from "@/components/ui/DataRightsCard";
import { useRouter } from "next/navigation";

type RichCategoryExperience = {
  category: string;
  experience: string;
  company?: string;
  company_id?: string;
  company_address?: string;
  start_year?: number | null;
  end_year?: number | null;
  is_current?: boolean;
  reference_name?: string;
  reference_phone?: string;
  reference_role?: string;
};

type RichStudy = { level: string; status?: string; institution?: string };

type RecordShape = {
  id: string;
  name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  whatsapp: string;
  city_zone: string;
  city?: string;
  province?: string;
  country?: string;
  birth_date: string;
  gender: string;
  categories: string[];
  category_other: string;
  category_experience: RichCategoryExperience[] | null;
  availability: string[];
  references: (ReferenceValue | string)[] | null;
  references_text: string;
  studies: (RichStudy | string)[] | null;
  bio: string;
  has_own_transport: string;
  immediate_availability: boolean;
  expected_salary: string;
  consent_zone_visible: boolean;
  consent_contact: boolean;
  consent_public_profile: boolean;
  photo: string;
  cv_file: string;
  profile_slug: string;
};

function recordToValues(record: RecordShape): CandidateFormValues {
  const categoryWork: Record<string, CategoryWorkValue> = {};
  for (const entry of record.category_experience ?? []) {
    categoryWork[entry.category] = {
      noExperience: entry.experience === "sin_experiencia" && !entry.company,
      company: entry.company ?? "",
      companyId: entry.company_id ?? "",
      companyAddress: entry.company_address ?? "",
      startYear: entry.start_year ? String(entry.start_year) : "",
      endYear: entry.end_year ? String(entry.end_year) : "",
      isCurrent: Boolean(entry.is_current),
      referenceName: entry.reference_name ?? "",
      referencePhone: entry.reference_phone ?? "",
      referenceRole: entry.reference_role ?? "",
    };
  }
  for (const c of record.categories ?? []) {
    if (!categoryWork[c]) categoryWork[c] = emptyCategoryWork;
  }

  // Compatibilidad con perfiles cargados antes de "estudios estructurados":
  // los viejos guardaban texto libre (ej. "Secundario completo") que no
  // mapea a un nivel -> esos se pierden al reeditar y guardar (dato de
  // seed/pre-lanzamiento, no de usuarios reales todavía).
  const studyLevels: string[] = [];
  const studyWork: Record<string, StudyLevelValue> = {};
  for (const entry of record.studies ?? []) {
    if (typeof entry === "string") continue;
    studyLevels.push(entry.level);
    studyWork[entry.level] = {
      status: entry.status ?? "",
      institution: entry.institution ?? "",
    };
  }

  // Compatibilidad con perfiles cargados antes de "referencias
  // estructuradas": el texto libre viejo (ej. "Ana, ex encargada...") no se
  // puede partir de forma confiable en nombre/relación/teléfono, así que
  // entra entero en "nombre" -- se ve raro pero no se pierde el dato.
  const references: ReferenceValue[] = (
    record.references?.length
      ? record.references
      : record.references_text
        ? record.references_text.split(";").map((r) => r.trim()).filter(Boolean)
        : []
  ).map((r) => (typeof r === "string" ? { name: r, relation: "", phone: "" } : r));

  // first_name/last_name pueden faltar en perfiles viejos -> partimos `name`
  // como mejor esfuerzo para no dejar el formulario vacío.
  const [fallbackFirst, ...fallbackRest] = (record.name ?? "").split(" ");

  return {
    firstName: record.first_name || fallbackFirst || "",
    middleName: record.middle_name || "",
    lastName: record.last_name || fallbackRest.join(" ") || "",
    whatsapp: record.whatsapp,
    city_zone: record.city_zone,
    city: record.city ?? "",
    province: record.province ?? "",
    country: record.country ?? "",
    birth_date: record.birth_date ? record.birth_date.slice(0, 10) : "",
    gender: record.gender,
    categories: record.categories ?? [],
    categoryWork,
    category_other: record.category_other ?? "",
    availability: record.availability ?? [],
    references,
    studyLevels,
    studyWork,
    bio: record.bio ?? "",
    has_own_transport: record.has_own_transport ?? "",
    immediate_availability: record.immediate_availability ?? false,
    expected_salary: record.expected_salary ?? "",
    consent_save: true,
    consent_zone_visible: record.consent_zone_visible ?? false,
    consent_contact: record.consent_contact ?? false,
    consent_public_profile: record.consent_public_profile ?? false,
    profileSlug: record.profile_slug ?? "",
  };
}

function EditarContent() {
  const router = useRouter();
  const { isAuthenticated, userId } = usePostulanteAuth({ requireRole: false });

  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "not-found" }
    | { status: "ready"; record: RecordShape }
  >({ status: "loading" });

  useEffect(() => {
    if (!userId) return;
    pb()
      .collection("candidate_profiles")
      .getFirstListItem(`user="${userId}"`, { requestKey: null })
      .then((record) => setState({ status: "ready", record: record as unknown as RecordShape }))
      .catch(() => setState({ status: "not-found" }));
  }, [userId]);

  if (!isAuthenticated) return null;

  if (state.status === "loading") {
    return (
      <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
        Buscando tu perfil...
      </p>
    );
  }

  if (state.status === "not-found") {
    return (
      <Card>
        <h2 className="font-bold mb-2">Todavía no creaste tu perfil</h2>
        <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
          Con esta misma cuenta de Google podés crear tu perfil ahora.
        </p>
        <LinkButton href="/postulante/nuevo">Crear mi perfil</LinkButton>
      </Card>
    );
  }

  const { record } = state;
  const client = pb();
  const existingPhotoUrl = record.photo ? client.files.getURL(record, record.photo) : undefined;

  return (
    <>
      <CandidateForm
        mode={{
          kind: "edit",
          id: record.id,
          existingPhotoUrl,
          existingCvName: record.cv_file || undefined,
        }}
        initialValues={recordToValues(record)}
      />
      <DataRightsCard
        data={record}
        fileNamePrefix="mi-perfil"
        deleteLabel="Eliminar mi perfil"
        deleteConfirmText="Esto borra tu perfil laboral de TuCV para siempre -- tus postulaciones enviadas y tu link público dejan de funcionar. No se puede deshacer."
        onDelete={async () => {
          await pb().collection("candidate_profiles").delete(record.id);
          router.push("/");
        }}
      />
    </>
  );
}

export default function EditarPostulantePage() {
  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Editá tu perfil</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Actualizá tus datos cuando quieras, entrando con tu cuenta de Google.
        </p>
        <EditarContent />
      </div>
    </main>
  );
}
