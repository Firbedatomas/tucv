"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { consumeGoogleProfile } from "@/lib/google-profile-stash";
import { trackEvent } from "@/lib/track";
import { emitActivity } from "@/lib/emit-activity";
import {
  CATEGORIES,
  AVAILABILITY,
  GENDER,
  STUDY_LEVELS,
  MOBILITY,
  labelFor,
  computeScreeningScore,
  type ScreeningQuestion,
} from "@/lib/constants";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";
import { FormSection } from "@/components/ui/FormSection";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { ChipMultiSelect } from "@/components/ui/ChipMultiSelect";
import { SingleChipSelect } from "@/components/ui/SingleChipSelect";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { FileUpload } from "@/components/ui/FileUpload";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { resizeImageFile } from "@/lib/image-resize";
import { suggestAvailableSlug } from "@/lib/profile-slug";
import {
  CategoryWorkEntryField,
  computeExperienceBucket,
  emptyCategoryWork,
  type CategoryWorkValue,
} from "@/components/postulante/CategoryWorkEntry";
import {
  StudyLevelEntryField,
  emptyStudyLevel,
  type StudyLevelValue,
} from "@/components/postulante/StudyLevelEntry";
import { ReferenceListInput, type ReferenceValue } from "@/components/postulante/ReferenceListInput";
import { ThousandsInput } from "@/components/ui/ThousandsInput";
import { OnboardingCandidate } from "@/components/onboarding/OnboardingCandidate";

export type CandidateFormValues = {
  firstName: string;
  middleName: string;
  lastName: string;
  whatsapp: string;
  city_zone: string;
  // Desglose estructurado de city_zone, solo para el fallback de zona
  // (ciudad -> provincia -> país) -- nunca se muestran, se llenan solos al
  // elegir una sugerencia real del autocomplete (ver AddressAutocomplete,
  // onSelectDetails). Quedan vacíos si la persona tipeó la zona a mano.
  city: string;
  province: string;
  country: string;
  birth_date: string;
  gender: string;
  categories: string[];
  categoryWork: Record<string, CategoryWorkValue>;
  category_other: string;
  availability: string[];
  references: ReferenceValue[];
  studyLevels: string[];
  studyWork: Record<string, StudyLevelValue>;
  bio: string;
  has_own_transport: string;
  immediate_availability: boolean;
  expected_salary: string;
  consent_save: boolean;
  consent_zone_visible: boolean;
  consent_contact: boolean;
  consent_public_profile: boolean;
  profileSlug: string;
};

export const emptyCandidateForm: CandidateFormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  whatsapp: "",
  city_zone: "",
  city: "",
  province: "",
  country: "",
  birth_date: "",
  gender: "",
  categories: [],
  categoryWork: {},
  category_other: "",
  availability: [],
  references: [],
  studyLevels: [],
  studyWork: {},
  bio: "",
  has_own_transport: "",
  immediate_availability: false,
  expected_salary: "",
  consent_save: false,
  consent_zone_visible: false,
  consent_contact: false,
  // NUNCA pre-tildado: hacer público un perfil es tratamiento/publicación de
  // datos personales y exige consentimiento explícito e informado (Ley 25.326
  // / criterios AAIP). La card lo RECOMIENDA (badge "Recomendado") pero la
  // persona tiene que tildarlo a mano. "Recomendado durante onboarding, pero
  // activado solo con consentimiento explícito."
  consent_public_profile: false,
  profileSlug: "",
};

type Mode =
  | { kind: "create" }
  | { kind: "edit"; id: string; existingPhotoUrl?: string; existingCvName?: string };

export function CandidateForm({
  mode,
  initialValues,
  applyToJobPostId,
}: {
  mode: Mode;
  initialValues?: CandidateFormValues;
  applyToJobPostId?: string;
}) {
  const { isAuthenticated, userId } = usePostulanteAuth({
    redirectIfLoggedOut: mode.kind === "create",
    requireRole: false,
  });
  // Nombre/foto de la cuenta de Google recién logueada -- se lee (y se
  // borra) una sola vez, en el estado inicial, en vez de en un efecto: es
  // exactamente "estado derivado de algo leído al montar", no una
  // sincronización con un sistema externo. Sigue siendo editable -- una
  // cuenta de Google puede tener el nombre mal cargado o ser de otra
  // persona (ej. alguien que arma el perfil para un familiar).
  const [googleHint] = useState(() => (mode.kind === "create" ? consumeGoogleProfile() : null));
  const [values, setValues] = useState<CandidateFormValues>(() => {
    if (initialValues) return initialValues;
    if (!googleHint?.name) return emptyCandidateForm;
    const [first, ...rest] = googleHint.name.trim().split(/\s+/);
    return { ...emptyCandidateForm, firstName: first || "", lastName: rest.join(" ") };
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    mode.kind === "edit" ? mode.existingPhotoUrl ?? null : googleHint?.avatarUrl ?? null,
  );
  // Recién se convierte a File (para poder subirla) al enviar el
  // formulario -- así evitamos el fetch entero si la persona termina
  // subiendo una foto propia en su lugar.
  const googleAvatarUrl = mode.kind === "create" ? googleHint?.avatarUrl ?? null : null;
  const [resizingPhoto, setResizingPhoto] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  // Preguntas filtro de la búsqueda a la que se está aplicando en el mismo
  // paso de crear el perfil -- antes esta postulación se creaba sin
  // pasar por acá (solo el flujo de postularse desde un perfil ya
  // existente las pedía), quedaba inconsistente con el ranking del panel.
  const [jobQuestions, setJobQuestions] = useState<ScreeningQuestion[]>([]);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    id: string;
    slug: string;
    applied: boolean;
  } | null>(null);

  useEffect(() => {
    if (!applyToJobPostId) return;
    let cancelled = false;
    pb()
      .collection("job_posts")
      .getOne(applyToJobPostId, { requestKey: null })
      .then((job) => {
        if (!cancelled) setJobQuestions((job.screening_questions as ScreeningQuestion[]) ?? []);
      })
      .catch(() => {
        // Si no se puede leer la búsqueda (cerrada, borrada, etc.) seguimos
        // sin preguntas -- la postulación en sí ya maneja ese error aparte.
      });
    return () => {
      cancelled = true;
    };
  }, [applyToJobPostId]);

  function set<K extends keyof CandidateFormValues>(key: K, value: CandidateFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function setCategories(next: string[]) {
    setValues((v) => {
      const categoryWork = { ...v.categoryWork };
      for (const key of Object.keys(categoryWork)) {
        if (!next.includes(key)) delete categoryWork[key];
      }
      for (const key of next) {
        if (!categoryWork[key]) categoryWork[key] = emptyCategoryWork;
      }
      return { ...v, categories: next, categoryWork };
    });
  }

  function setCategoryWork(category: string, entry: CategoryWorkValue) {
    setValues((v) => ({ ...v, categoryWork: { ...v.categoryWork, [category]: entry } }));
  }

  function setStudyLevels(next: string[]) {
    setValues((v) => {
      const studyWork = { ...v.studyWork };
      for (const key of Object.keys(studyWork)) {
        if (!next.includes(key)) delete studyWork[key];
      }
      for (const key of next) {
        if (!studyWork[key]) studyWork[key] = emptyStudyLevel;
      }
      return { ...v, studyLevels: next, studyWork };
    });
  }

  function setStudyWork(level: string, entry: StudyLevelValue) {
    setValues((v) => ({ ...v, studyWork: { ...v.studyWork, [level]: entry } }));
  }

  async function handlePhotoChange(file: File | null) {
    if (!file) return;
    setResizingPhoto(true);
    try {
      const resized = await resizeImageFile(file);
      setPhoto(resized);
      setPhotoPreview(URL.createObjectURL(resized));
    } catch {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    } finally {
      setResizingPhoto(false);
    }
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!values.firstName.trim()) e.firstName = "Ingresá tu nombre.";
    if (!values.lastName.trim()) e.lastName = "Ingresá tu apellido.";
    if (!values.whatsapp.trim()) e.whatsapp = "Ingresá tu WhatsApp.";
    if (!values.city_zone.trim()) e.city_zone = "Ingresá tu ciudad, zona o barrio.";
    if (!values.birth_date) e.birth_date = "Ingresá tu fecha de nacimiento.";
    if (!values.gender) e.gender = "Elegí una opción.";
    if (values.categories.length === 0) e.categories = "Elegí al menos un rubro.";
    if (values.categories.includes("otro") && !values.category_other.trim()) {
      e.category_other = "Contanos qué rubro es.";
    }
    const incompleteWork = values.categories.some((c) => {
      const entry = values.categoryWork[c];
      if (!entry) return true;
      if (entry.noExperience) return false;
      // "Hasta"/"actualidad" quedaron opcionales (computeExperienceBucket
      // asume que sigue trabajando ahí si no se especifica) -- exigirlos acá
      // bloqueaba el guardado entero por un campo chico, y probablemente le
      // pasó justo eso a un usuario real que nunca llegó a guardar su perfil.
      return !entry.company.trim() || !entry.startYear;
    });
    if (values.categories.length > 0 && incompleteWork) {
      e.categoryWork = "Para cada rubro: marcá \"sin experiencia\" o completá al menos la empresa y desde qué año.";
    }
    if (values.availability.length === 0) e.availability = "Elegí al menos una disponibilidad.";
    if (mode.kind === "create" && !values.consent_save) {
      e.consent_save = "Necesitamos tu consentimiento para guardar el perfil.";
    }
    if (jobQuestions.some((q) => q.type === "si_no" && !screeningAnswers[q.id])) {
      e.screeningAnswers = "Respondé las preguntas de la búsqueda para poder postularte.";
    }
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      // Sin esto, tocar "Guardar" con un error arriba (scrolleado fuera de
      // vista, ej. en "Experiencia por rubro") no hace NADA visible -- la
      // persona no tiene forma de saber que hay que corregir algo, y
      // probablemente esto es justo lo que le pasó a un usuario real que
      // nunca logró guardar su perfil pese a reintentar varias veces.
      const firstErrorKey = Object.keys(v)[0];
      requestAnimationFrame(() => {
        document.querySelector(`[data-field="${firstErrorKey}"]`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const client = pb();
      const currentYear = new Date().getFullYear();
      const fullName = [values.firstName, values.middleName, values.lastName]
        .map((p) => p.trim())
        .filter(Boolean)
        .join(" ");

      // El slug es estable: si el perfil ya tiene uno, no lo tocamos (no
      // queremos romper un link que la persona ya haya compartido).
      const slug =
        values.profileSlug ||
        (await suggestAvailableSlug(
          values.firstName,
          values.lastName,
          mode.kind === "edit" ? mode.id : undefined,
        ));

      const formData = new FormData();
      formData.append("name", fullName);
      formData.append("first_name", values.firstName.trim());
      formData.append("middle_name", values.middleName.trim());
      formData.append("last_name", values.lastName.trim());
      formData.append("whatsapp", values.whatsapp.trim());
      formData.append("city_zone", values.city_zone.trim());
      formData.append("city", values.city);
      formData.append("province", values.province);
      formData.append("country", values.country);
      formData.append("birth_date", values.birth_date);
      formData.append("gender", values.gender);
      values.categories.forEach((c) => formData.append("categories", c));
      formData.append("category_other", values.category_other.trim());

      const categoryExperienceList = values.categories.map((category) => {
        const entry = values.categoryWork[category] ?? emptyCategoryWork;
        return {
          category,
          experience: computeExperienceBucket(entry, currentYear),
          company: entry.company.trim(),
          company_id: entry.companyId || null,
          company_address: entry.companyAddress.trim(),
          start_year: entry.startYear ? Number(entry.startYear) : null,
          end_year: entry.isCurrent ? null : entry.endYear ? Number(entry.endYear) : null,
          is_current: entry.isCurrent,
          reference_name: entry.referenceName.trim(),
          reference_phone: entry.referencePhone.trim(),
          reference_role: entry.referenceRole.trim(),
        };
      });
      formData.append("category_experience", JSON.stringify(categoryExperienceList));
      formData.append(
        "experience",
        categoryExperienceList.some((e) => e.experience === "mas_3_anos")
          ? "mas_3_anos"
          : categoryExperienceList.some((e) => e.experience === "1_a_3_anos")
            ? "1_a_3_anos"
            : categoryExperienceList.some((e) => e.experience === "6_a_12_meses")
              ? "6_a_12_meses"
              : categoryExperienceList.some((e) => e.experience === "menos_6_meses")
                ? "menos_6_meses"
                : "sin_experiencia",
      );
      values.availability.forEach((a) => formData.append("availability", a));
      formData.append("has_own_transport", values.has_own_transport);
      formData.append("immediate_availability", String(values.immediate_availability));
      formData.append("expected_salary", values.expected_salary.trim());
      formData.append("references", JSON.stringify(values.references));
      // references_text es un respaldo legacy de antes de "referencias
      // estructuradas" -- lo seguimos llenando por si algo todavía lo lee,
      // aplanando los 3 campos en una línea por referencia.
      formData.append(
        "references_text",
        values.references
          .map((r) => [r.name, r.relation, r.phone].filter(Boolean).join(", "))
          .join("; "),
      );

      const studiesList = values.studyLevels.map((level) => {
        const entry = values.studyWork[level] ?? emptyStudyLevel;
        return { level, status: entry.status, institution: entry.institution.trim() };
      });
      formData.append("studies", JSON.stringify(studiesList));
      formData.append("bio", values.bio.trim());
      formData.append("profile_slug", slug);

      let photoToUpload = photo;
      if (!photoToUpload && googleAvatarUrl) {
        try {
          const resp = await fetch(googleAvatarUrl);
          const blob = await resp.blob();
          photoToUpload = new File([blob], "foto-google.jpg", { type: blob.type || "image/jpeg" });
        } catch {
          // Best-effort: si Google no deja leer la imagen desde acá (CORS,
          // etc.) el perfil se guarda igual, sin foto -- la persona la puede
          // sumar después desde "editar perfil".
        }
      }
      if (photoToUpload) formData.append("photo", photoToUpload);
      if (cvFile) formData.append("cv_file", cvFile);

      if (mode.kind === "create") {
        formData.append("user", userId ?? "");
        formData.append("consent_save", String(values.consent_save));
        formData.append("consent_zone_visible", String(values.consent_zone_visible));
        formData.append("consent_contact", String(values.consent_contact));
        formData.append("consent_public_profile", String(values.consent_public_profile));
        const record = await client.collection("candidate_profiles").create(formData);
        trackEvent("Postulante: registro completado");
        trackEvent("Postulante: perfil completado");
        if (values.consent_public_profile) trackEvent("Postulante: perfil publico activado");
        emitActivity("candidate_registered", { candidateId: record.id });
        if (values.consent_public_profile) emitActivity("public_enabled", { candidateId: record.id });

        let applied = false;
        if (applyToJobPostId) {
          try {
            const answers = jobQuestions
              .filter((q) => screeningAnswers[q.id]?.trim())
              .map((q) => ({ questionId: q.id, answer: screeningAnswers[q.id].trim() }));
            await client.collection("applications").create({
              job_post: applyToJobPostId,
              candidate: record.id,
              status: "nuevo",
              screening_answers: answers,
              score: computeScreeningScore(jobQuestions, answers),
            });
            applied = true;
            trackEvent("Postulante: postulacion enviada");
            emitActivity("application_sent", { candidateId: record.id });
          } catch {
            // El perfil ya se guardó; si la postulación falla (búsqueda cerrada,
            // etc.) no lo tratamos como error del formulario.
          }
        }
        setSuccess({ id: record.id, slug: record.profile_slug, applied });
      } else {
        formData.append("consent_zone_visible", String(values.consent_zone_visible));
        formData.append("consent_contact", String(values.consent_contact));
        formData.append("consent_public_profile", String(values.consent_public_profile));
        const record = await client.collection("candidate_profiles").update(mode.id, formData);
        trackEvent("Postulante: perfil completado");
        if (values.consent_public_profile && !initialValues?.consent_public_profile) {
          trackEvent("Postulante: perfil publico activado");
        }
        setSuccess({ id: mode.id, slug: record.profile_slug, applied: false });
      }
    } catch {
      setSubmitError("No pudimos guardar tu perfil. Revisá los datos e intentá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const publicLink = success.slug ? `${origin}/p/${success.slug}` : null;
    return (
      <>
      <Card>
        <h2 className="text-xl font-bold mb-2">
          {mode.kind === "create"
            ? success.applied
              ? "¡Listo, tu perfil quedó guardado y ya te postulaste!"
              : "¡Listo, tu perfil quedó guardado!"
            : "¡Actualizamos tu perfil!"}
        </h2>

        {publicLink && (
          <>
            <p className="text-sm mb-2" style={{ color: "var(--tucv-muted)" }}>
              Esta es tu URL de perfil público — compartila donde quieras, es como tu CV digital.
            </p>
            <div
              className="text-sm p-3 rounded-[var(--tucv-radius)] break-all mb-4 font-semibold"
              style={{ backgroundColor: "var(--tucv-bg)", border: "1px solid var(--tucv-border)" }}
            >
              {publicLink}
            </div>
          </>
        )}

        <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
          Para editar tu perfil más adelante, entrá con la misma cuenta de Google desde{" "}
          <LinkButton href="/postulante/editar" variant="ghost" className="px-1 py-0 inline">
            tucv.ar/postulante/editar
          </LinkButton>
          .
        </p>
        {publicLink && (
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => navigator.clipboard?.writeText(publicLink)}>
              Copiar mi perfil
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent("Guardé mi perfil en TuCV: " + publicLink)}`,
                  "_blank",
                )
              }
            >
              Enviarme por WhatsApp
            </Button>
          </div>
        )}
      </Card>
      {success.slug && <OnboardingCandidate slug={success.slug} />}
      </>
    );
  }

  if (mode.kind === "create" && !isAuthenticated) return null;

  return (
    <form onSubmit={handleSubmit} noValidate autoComplete="on">
      <Card>
        {Object.keys(errors).length > 0 && (
          <div
            className="text-sm font-semibold px-3 py-2 mb-4 rounded-[var(--tucv-radius)]"
            style={{ backgroundColor: "#FEE2E2", color: "#B42318", border: "1.5px solid #FCA5A5" }}
          >
            Hay {Object.keys(errors).length === 1 ? "un campo" : `${Object.keys(errors).length} campos`} por
            completar — están marcados en rojo más abajo.
          </div>
        )}
        <FormSection number={1} title="Tus datos" />
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Field label="Nombre" required error={errors.firstName} fieldKey="firstName">
              <input
                className={inputClass}
                style={inputStyle}
                name="given-name"
                autoComplete="given-name"
                value={values.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="Juana"
              />
            </Field>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Field label="Segundo nombre (opcional)">
              <input
                className={inputClass}
                style={inputStyle}
                name="additional-name"
                autoComplete="additional-name"
                value={values.middleName}
                onChange={(e) => set("middleName", e.target.value)}
                placeholder="Belén"
              />
            </Field>
          </div>
        </div>

        <Field label="Apellido" required error={errors.lastName} fieldKey="lastName">
          <input
            className={inputClass}
            style={inputStyle}
            name="family-name"
            autoComplete="family-name"
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="Pérez"
          />
        </Field>

        <Field label="WhatsApp" required error={errors.whatsapp} fieldKey="whatsapp">
          <input
            className={inputClass}
            style={inputStyle}
            name="tel"
            autoComplete="tel"
            value={values.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="11 2233 4455"
            inputMode="tel"
          />
        </Field>

        <Field label="Ciudad / zona / barrio" required error={errors.city_zone} fieldKey="city_zone">
          <AddressAutocomplete
            name="address-level2"
            autoComplete="address-level2"
            value={values.city_zone}
            onChange={(v) => set("city_zone", v)}
            onSelectDetails={(d) => setValues((v) => ({ ...v, city: d.city, province: d.province, country: d.country }))}
            placeholder="Palermo, CABA"
          />
        </Field>

        <Field label="Fecha de nacimiento" required error={errors.birth_date} fieldKey="birth_date">
          <input
            type="date"
            className={inputClass}
            style={inputStyle}
            name="bday"
            autoComplete="bday"
            value={values.birth_date}
            onChange={(e) => set("birth_date", e.target.value)}
          />
        </Field>

        <Field label="Sexo / género" required error={errors.gender} fieldKey="gender">
          <select
            className={inputClass}
            style={inputStyle}
            name="sex"
            autoComplete="sex"
            value={values.gender}
            onChange={(e) => set("gender", e.target.value)}
          >
            <option value="">Elegí una opción</option>
            {GENDER.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Foto">
          <PhotoUpload previewUrl={photoPreview} onFileSelected={handlePhotoChange} processing={resizingPhoto} />
        </Field>

        <FormSection number={2} title="Tu experiencia" hint="Rubros en los que trabajaste o querés trabajar." />
        <Field label="Rubros / puestos" required error={errors.categories} hint="Hasta 6." fieldKey="categories">
          <ChipMultiSelect options={CATEGORIES} value={values.categories} onChange={setCategories} max={6} />
        </Field>

        {values.categories.includes("otro") && (
          <Field label="¿Qué otro rubro?" required error={errors.category_other} fieldKey="category_other">
            <input
              className={inputClass}
              style={inputStyle}
              value={values.category_other}
              onChange={(e) => set("category_other", e.target.value)}
            />
          </Field>
        )}

        {values.categories.length > 0 && (
          <Field
            label="Experiencia por rubro"
            required
            error={errors.categoryWork}
            hint="Contanos en qué empresa y desde cuándo — calculamos los años solos."
            fieldKey="categoryWork"
          >
            <div className="space-y-4">
              {values.categories.map((c) => (
                <div key={c} className="rounded-[var(--tucv-radius)] p-3" style={{ backgroundColor: "var(--tucv-bg)" }}>
                  <p className="text-sm font-semibold mb-2">
                    {c === "otro" ? values.category_other || "Otro" : labelFor(CATEGORIES, c)}
                  </p>
                  <CategoryWorkEntryField
                    value={values.categoryWork[c] ?? emptyCategoryWork}
                    onChange={(entry) => setCategoryWork(c, entry)}
                  />
                </div>
              ))}
            </div>
          </Field>
        )}

        <Field label="Disponibilidad" required error={errors.availability} fieldKey="availability">
          <ChipMultiSelect
            options={AVAILABILITY}
            value={values.availability}
            onChange={(v) => set("availability", v)}
          />
        </Field>

        <Field label="Movilidad (opcional)" hint="Ayuda a que te encuentren para puestos que la piden.">
          <SingleChipSelect
            options={MOBILITY}
            value={values.has_own_transport}
            onChange={(v) => set("has_own_transport", v)}
          />
        </Field>

        <Field label="Incorporación (opcional)">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.immediate_availability}
              onChange={(e) => set("immediate_availability", e.target.checked)}
            />
            Puedo empezar de inmediato
          </label>
        </Field>

        <FormSection number={3} title="Estudios y referencias" hint="Todo opcional, pero suma confianza." />
        <Field label="Estudios (opcional)" hint="Elegí los niveles que hiciste.">
          <ChipMultiSelect options={STUDY_LEVELS} value={values.studyLevels} onChange={setStudyLevels} />
        </Field>

        {values.studyLevels.length > 0 && (
          <div className="space-y-3 mb-4 -mt-2">
            {values.studyLevels.map((level) => (
              <div key={level} className="rounded-[var(--tucv-radius)] p-3" style={{ backgroundColor: "var(--tucv-bg)" }}>
                <p className="text-sm font-semibold mb-2">{labelFor(STUDY_LEVELS, level)}</p>
                <StudyLevelEntryField
                  value={values.studyWork[level] ?? emptyStudyLevel}
                  onChange={(entry) => setStudyWork(level, entry)}
                />
              </div>
            ))}
          </div>
        )}

        <Field label="Referencias (opcional)" hint="Sumá una por una.">
          <ReferenceListInput value={values.references} onChange={(next) => set("references", next)} />
        </Field>

        <FormSection number={4} title="Para terminar" />
        <Field label="Sueldo pretendido (opcional)" hint="Solo si querés compartirlo. Podés escribir un monto o 'a convenir'.">
          <ThousandsInput
            className={inputClass}
            style={inputStyle}
            value={values.expected_salary}
            onChange={(v) => set("expected_salary", v)}
            placeholder="$500.000 o a convenir"
          />
        </Field>

        <Field label="Contanos algo de vos (opcional)" hint="Máximo 400 caracteres.">
          <textarea
            className={inputClass}
            style={inputStyle}
            rows={3}
            maxLength={400}
            value={values.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Responsable, puntual, con ganas de sumar en un equipo."
          />
        </Field>

        <Field
          label="CV en archivo (opcional)"
          hint="Si tenés un PDF o foto de tu CV, lo podés sumar."
        >
          <FileUpload
            accept="application/pdf,image/png,image/jpeg"
            fileName={cvFile?.name ?? (mode.kind === "edit" ? mode.existingCvName ?? null : null)}
            onFileSelected={setCvFile}
          />
        </Field>

        {jobQuestions.length > 0 && (
          <Field label="Preguntas de esta búsqueda" error={errors.screeningAnswers} fieldKey="screeningAnswers">
            <div
              className="space-y-3 p-3 rounded-[var(--tucv-radius)]"
              style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
            >
              {jobQuestions.map((q) => (
                <div key={q.id}>
                  <p className="text-sm font-medium mb-1.5">{q.question}</p>
                  {q.type === "si_no" ? (
                    <div className="flex gap-2">
                      {[
                        { value: "si", label: "Sí" },
                        { value: "no", label: "No" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setScreeningAnswers((a) => ({ ...a, [q.id]: opt.value }))}
                          className="text-sm px-4 py-1.5 rounded-[var(--tucv-radius)] border-2"
                          style={
                            screeningAnswers[q.id] === opt.value
                              ? { backgroundColor: "var(--tucv-primary)", color: "var(--tucv-primary-text)", borderColor: "var(--tucv-border)" }
                              : { backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", borderColor: "var(--tucv-border)" }
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      className={inputClass}
                      style={inputStyle}
                      value={screeningAnswers[q.id] ?? ""}
                      onChange={(e) => setScreeningAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </Field>
        )}

        {mode.kind === "create" && (
          <label className="flex items-start gap-2 mb-3 text-sm" data-field="consent_save">
            <input
              type="checkbox"
              className="mt-1"
              checked={values.consent_save}
              onChange={(e) => set("consent_save", e.target.checked)}
            />
            <span>
              Doy mi consentimiento para que TuCV guarde mi perfil y lo comparta con los negocios
              a los que me postule, según los{" "}
              <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline">
                Términos
              </a>{" "}
              y la{" "}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">
                Política de Privacidad
              </a>{" "}
              de TuCV.
              {errors.consent_save && (
                <span className="block text-xs mt-1 font-medium" style={{ color: "#DC2626" }}>
                  {errors.consent_save}
                </span>
              )}
            </span>
          </label>
        )}

        <label className="flex items-start gap-2 mb-5 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={values.consent_zone_visible}
            onChange={(e) => set("consent_zone_visible", e.target.checked)}
          />
          <span>
            Además, quiero que empleadores de mi zona puedan ver mi perfil aunque no me haya
            postulado a su búsqueda (opcional).
          </span>
        </label>

        {/* Contacto directo depende de ser visible para empresas: sin lo primero,
            no hay a quién habilitar el WhatsApp. Se deshabilita (no se oculta)
            para que se entienda la relación entre ambos permisos. */}
        <label
          className="flex items-start gap-2 mb-5 text-sm ml-6"
          style={{ opacity: values.consent_zone_visible ? 1 : 0.5 }}
        >
          <input
            type="checkbox"
            className="mt-1"
            disabled={!values.consent_zone_visible}
            checked={values.consent_zone_visible && values.consent_contact}
            onChange={(e) => set("consent_contact", e.target.checked)}
          />
          <span>
            Y que puedan escribirme por WhatsApp directo desde mi perfil (opcional). Si no lo
            activás, las empresas ven tu perfil pero no tu teléfono.
          </span>
        </label>

        {/* Perfil público: la opción de mayor visibilidad, destacada (tema
            "Impacto") porque es la que más chances de contacto da -- el perfil
            aparece también en el directorio abierto, no solo en la búsqueda
            privada de empresas. RECOMENDADA pero NUNCA pre-tildada: publicar
            datos personales exige consentimiento explícito (Ley 25.326 / AAIP).
            El card público nunca expone WhatsApp/DNI/email/fecha de nacimiento. */}
        <div
          className="mb-5 p-4 rounded-[var(--tucv-radius)]"
          style={{
            backgroundColor: "var(--tucv-accent)",
            border: "2px solid var(--tucv-border)",
            boxShadow: "3px 3px 0 var(--tucv-border)",
          }}
        >
          <span
            className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-[var(--tucv-radius)] mb-2"
            style={{ backgroundColor: "var(--tucv-text)", color: "var(--tucv-bg)" }}
          >
            Recomendado
          </span>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 shrink-0"
              checked={values.consent_public_profile}
              onChange={(e) => set("consent_public_profile", e.target.checked)}
            />
            <span className="text-sm" style={{ color: "var(--tucv-text)" }}>
              <span className="font-bold block mb-0.5 text-base">
                Hacé público tu perfil — es el que más te encuentran.
              </span>
              Aparecés en <strong>&quot;Gente lista para laburar cerca tuyo&quot;</strong>, el
              directorio abierto que ve cualquiera sin cuenta, además de las búsquedas de las
              empresas.{" "}
              <span className="font-semibold">Más lugares donde aparecés, más contactos.</span>
              <span className="block mt-1.5 text-xs" style={{ color: "var(--tucv-text)", opacity: 0.7 }}>
                Nunca mostramos tu WhatsApp, DNI, email ni fecha de nacimiento. Lo desactivás cuando
                quieras.
              </span>
            </span>
          </label>
        </div>

        {submitError && (
          <p className="text-sm mb-3 font-medium" style={{ color: "#DC2626" }}>
            {submitError}
          </p>
        )}

        <Button type="submit" disabled={submitting || resizingPhoto} className="w-full">
          {submitting ? "Guardando..." : mode.kind === "create" ? "Guardar mi perfil" : "Guardar cambios"}
        </Button>
      </Card>
    </form>
  );
}
