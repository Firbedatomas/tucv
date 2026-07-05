"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { trackEvent } from "@/lib/track";
import { emitActivity } from "@/lib/emit-activity";
import {
  CATEGORIES,
  EXPERIENCE,
  AVAILABILITY,
  DURATION_DAYS,
  JOB_PERKS,
  SALARY_MODE,
  VACANCIES,
  HARD_REQUIREMENTS,
  DAY_PATTERNS,
  SCHEDULE_HOURS_SUGGESTIONS,
  ROLE_SUGGESTIONS_BY_CATEGORY,
  taskSuggestionsFor,
  labelFor,
  PROGRAM_MODE,
  PROGRAM_INTEREST,
  PROGRAM_VISIBILITY,
  type ScreeningQuestion,
} from "@/lib/constants";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { ChipMultiSelect } from "@/components/ui/ChipMultiSelect";
import { SingleChipSelect } from "@/components/ui/SingleChipSelect";
import { TagInput } from "@/components/ui/TagInput";
import { ScreeningQuestionsEditor } from "@/components/empresa/ScreeningQuestionsEditor";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { QRCodeView } from "@/components/qr/QRCodeView";
import { generateJobFlyerDataUrl } from "@/lib/job-flyer";
import { makeJobSlug, slugify, generateShortCode, businessSlugFor } from "@/lib/slug";
import { ThousandsInput } from "@/components/ui/ThousandsInput";
import { BoostJobButton } from "@/components/empresa/BoostJobButton";
import {
  activeJobLimit,
  autoBoostsOnCreate,
  monthlyJobLimit,
  maxDurationDays,
  hidesExtraChips,
  canPrioritizeProgramCandidates,
} from "@/lib/plan-limits";
import { suggestProgramsForZone, programById, PROGRAMS_DISCLAIMER } from "@/lib/employment-programs";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { sanitizeVisibleMessage } from "@/lib/sanitize-html";
import { OnboardingCompany } from "@/components/onboarding/OnboardingCompany";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

type Values = {
  category: string;
  category_other: string;
  address_zone: string;
  city: string;
  province: string;
  country: string;
  role: string;
  main_tasks: string[];
  shift: string[];
  experience_required: string;
  perks: string[];
  visible_message: string;
  duration_days: string;
  schedule_days: string;
  schedule_hours: string[];
  vacancies: string;
  hard_requirements: string[];
  salary_mode: string;
  salary_amount: string;
  screening_questions: ScreeningQuestion[];
  // Programas laborales (opcional). programs_visibility son chips de los que
  // se derivan los booleanos programs_public/ask_applicant/sort_top al guardar.
  programs_mode: string;
  programs_interest: string[];
  programs_visibility: string[];
};

const empty: Values = {
  category: "",
  category_other: "",
  address_zone: "",
  city: "",
  province: "",
  country: "",
  role: "",
  main_tasks: [],
  shift: [],
  experience_required: "",
  perks: [],
  visible_message: "",
  duration_days: "30",
  schedule_days: "",
  schedule_hours: [],
  vacancies: "",
  hard_requirements: [],
  salary_mode: "",
  salary_amount: "",
  screening_questions: [],
  programs_mode: "none",
  programs_interest: [],
  programs_visibility: [],
};

// Mismo largo que JOB_BOOST_DAYS en lib/mercadopago-pricing.ts (ese módulo
// es server-only, no se puede importar desde un client component) -- el
// beneficio real de Pro y Equipo hoy es este: cada búsqueda nueva
// arranca destacada sola, sin pagar boost aparte.
const AUTO_BOOST_DAYS = 7;

// Borrador en localStorage -- si alguien se va de la página a mitad de
// completar (ej. clickea "Con Pro dura más" para ver precios, se distrae, o
// cierra la pestaña sin querer), no queremos que pierda todo lo que ya
// tipeó. También aplica al editar: los cambios sin guardar de una búsqueda
// existente se pierden igual si se cierra la pestaña a mitad de editar, no
// es exclusivo de crear una nueva. Clave por búsqueda en modo edición (cada
// una guarda su propio borrador, no se pisan entre sí).
function draftKey(mode: JobPostFormMode): string {
  return mode.kind === "edit" ? `tucv_job_draft_edit_${mode.jobId}` : "tucv_job_draft_new";
}

export type JobPostFormMode =
  | { kind: "create" }
  | {
      kind: "edit";
      jobId: string;
      slug: string;
      status: string;
      // schedule_details se guarda como un solo string combinado ("Lunes a
      // viernes · 8 a 16hs") -- no lo reconstruimos de vuelta en
      // schedule_days/schedule_hours al editar (con qué criterio partir
      // "Lunes a viernes" de nuevo en un patrón + una lista de horarios sin
      // ambigüedad). Si la persona no toca esos dos campos en la edición,
      // este valor original se preserva tal cual en vez de perderse.
      initialScheduleDetails: string;
    };

export function JobPostForm({
  businessId,
  businessName,
  businessPlan,
  businessLogoUrl,
  mode = { kind: "create" },
  initialValues,
}: {
  businessId: string;
  businessName: string;
  businessPlan?: string;
  businessLogoUrl?: string | null;
  mode?: JobPostFormMode;
  initialValues?: Values;
}) {
  // El borrador se lee una sola vez, al montar (estado derivado de algo
  // externo leído al inicio, no una sincronización continua) -- si había
  // uno guardado, arranca de ahí en vez del valor "limpio" (vacío al crear,
  // o los datos del servidor al editar).
  const [restoredDraft] = useState(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(draftKey(mode));
      return raw ? (JSON.parse(raw) as Values) : null;
    } catch {
      return null;
    }
  });
  const [values, setValues] = useState<Values>(restoredDraft ?? initialValues ?? empty);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; slug: string; shortCode: string; featuredUntil?: string } | null>(
    null,
  );
  const [saved, setSaved] = useState(false);
  const plan = businessPlan ?? "free";

  // Autoguardado -- si se va de la página (upgrade de plan, cerrar la
  // pestaña sin querer, etc.) y vuelve, encuentra lo que ya había escrito.
  useEffect(() => {
    try {
      window.localStorage.setItem(draftKey(mode), JSON.stringify(values));
    } catch {
      // localStorage lleno o bloqueado (modo privado, etc.) -- no es motivo
      // para romper el formulario, simplemente no queda autoguardado.
    }
    // El objeto `mode` es una prop nueva en cada render del padre -- lo que
    // importa para la clave del borrador es jobId, no la identidad del
    // objeto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.kind, mode.kind === "edit" ? mode.jobId : null, values]);

  function discardDraft() {
    setValues(initialValues ?? empty);
    setDraftDismissed(true);
    try {
      window.localStorage.removeItem(draftKey(mode));
    } catch {
      // ver nota de arriba
    }
  }
  const lockedDuration = mode.kind === "create" ? maxDurationDays(plan) : null;

  // Programas laborales: derivados de plan + estado actual.
  const canPrioritizePrograms = canPrioritizeProgramCandidates(plan);
  const wantsPrograms = values.programs_mode === "accept" || values.programs_mode === "prioritize";
  const suggestedPrograms = suggestProgramsForZone(values.province);
  // El chip "ordenar compatibles arriba" es de plan pago -- en gratis ni se
  // muestra (el gating real al guardar está en el payload, más abajo).
  const visibilityOptions = canPrioritizePrograms
    ? PROGRAM_VISIBILITY
    : PROGRAM_VISIBILITY.filter((o) => o.value !== "sort_top");

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
  }

  function setCategory(category: string) {
    // El vocabulario de tareas depende del rubro -- si cambia, las tareas
    // ya tildadas de otro rubro dejan de tener sentido.
    setValues((v) => ({ ...v, category, main_tasks: [] }));
    setSaved(false);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!values.category) e.category = "Elegí un rubro.";
    if (values.category === "otro" && !values.category_other.trim()) {
      e.category_other = "Contanos qué rubro es.";
    }
    if (!values.address_zone.trim()) e.address_zone = "Ingresá la dirección o zona.";
    if (!values.role.trim()) e.role = "Ingresá el puesto.";
    if (values.shift.length === 0) e.shift = "Elegí al menos un turno.";
    if (!values.experience_required) e.experience_required = "Elegí la experiencia requerida.";
    if (values.salary_mode === "mostrar" && !values.salary_amount.trim()) {
      e.salary_amount = "Ingresá el monto o rango.";
    }
    return e;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const client = pb();
      const role = values.role.trim();
      const screeningQuestions = values.screening_questions.filter((q) => q.question.trim());
      const scheduleDetails =
        values.schedule_days || values.schedule_hours.length > 0
          ? [values.schedule_days ? labelFor(DAY_PATTERNS, values.schedule_days) : "", values.schedule_hours.join(", ")]
              .filter(Boolean)
              .join(" · ")
          : mode.kind === "edit"
            ? mode.initialScheduleDetails
            : "";

      const payload = {
        category: values.category,
        category_other: values.category === "otro" ? values.category_other.trim() : "",
        address_zone: values.address_zone.trim(),
        city: values.city,
        province: values.province,
        country: values.country,
        role,
        name: role,
        main_tasks: values.main_tasks,
        shift: values.shift,
        experience_required: values.experience_required,
        perks: values.perks,
        visible_message: sanitizeVisibleMessage(values.visible_message).trim(),
        duration_days: values.duration_days,
        schedule_details: scheduleDetails,
        vacancies: values.vacancies,
        hard_requirements: values.hard_requirements,
        salary_mode: values.salary_mode,
        salary_amount: values.salary_mode === "mostrar" ? values.salary_amount.trim() : "",
        screening_questions: screeningQuestions,
        // Programas laborales. Gating de plan aplicado acá al guardar:
        // "priorizar" en un plan sin la feature se degrada a "acepto", y
        // programs_sort_top solo queda true si el plan lo permite.
        programs_mode:
          values.programs_mode === "prioritize" && !canPrioritizePrograms
            ? "accept"
            : values.programs_mode || "none",
        programs_interest: wantsPrograms ? values.programs_interest : [],
        programs_public: wantsPrograms && values.programs_visibility.includes("public"),
        programs_ask_applicant: wantsPrograms && values.programs_visibility.includes("ask_applicant"),
        programs_sort_top:
          wantsPrograms && canPrioritizePrograms && values.programs_visibility.includes("sort_top"),
      };

      if (mode.kind === "edit") {
        // Editar no toca active/status/expires_at/featured_until -- eso lo
        // manejan las acciones del panel (pausar, reactivar, promocionar,
        // marcar cubierta), no el formulario de datos de la búsqueda.
        await client.collection("job_posts").update(mode.jobId, payload);
        setSaved(true);
        setSubmitting(false);
        try {
          window.localStorage.removeItem(draftKey(mode));
        } catch {
          // ver nota en el efecto de autoguardado
        }
        return;
      }

      // El plan gratis solo puede tener 1 búsqueda activa a la vez, Multi-
      // sucursal hasta 10, y Pro sin límite -- esa es la razón real para
      // subir de plan, no un tope arbitrario. Chequeamos acá (no solo con
      // una regla de PocketBase) para poder mostrar un mensaje claro en vez
      // de un error genérico de creación.
      const limit = activeJobLimit(plan);
      if (limit !== null) {
        const ownJobs = await client.collection("job_posts").getFullList({
          filter: client.filter("business = {:id} && active = true", { id: businessId }),
        });
        const stillActive = ownJobs.filter((j) => new Date(j.expires_at as string).getTime() > Date.now());
        if (stillActive.length >= limit) {
          setSubmitError(
            plan === "free"
              ? "Con el plan gratis podés tener 1 búsqueda activa a la vez. Cerrá la anterior o activá el plan Pro para publicar varias al mismo tiempo."
              : `Tu plan permite hasta ${limit} búsquedas activas a la vez. Cerrá alguna para publicar una nueva.`,
          );
          setSubmitting(false);
          return;
        }
      }

      // Además del límite de "activas a la vez", el plan gratis solo deja
      // CREAR una búsqueda por mes -- cerrarla antes no libera un cupo
      // nuevo, si no el límite de arriba no significaría nada (cerrar y
      // volver a crear todo el tiempo).
      const monthlyLimit = monthlyJobLimit(plan);
      if (monthlyLimit !== null) {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const recentJobs = await client.collection("job_posts").getList(1, 1, {
          filter: client.filter("business = {:id} && created > {:since}", { id: businessId, since }),
        });
        if (recentJobs.totalItems >= monthlyLimit) {
          setSubmitError(
            "Con el plan gratis podés crear 1 búsqueda por mes. Esperá a que pase el mes desde tu última búsqueda o activá el plan Pro para publicar cuando quieras.",
          );
          setSubmitting(false);
          return;
        }
      }

      const slug = makeJobSlug(businessName || slugify(role), role);
      const shortCode = generateShortCode();
      const autoFeaturedUntil = autoBoostsOnCreate(plan)
        ? new Date(Date.now() + AUTO_BOOST_DAYS * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
      // Plan gratis: la búsqueda dura 7 días siempre, sin importar qué haya
      // elegido el select (que además queda oculto para ese plan).
      const planMaxDuration = maxDurationDays(plan);
      const record = await client.collection("job_posts").create({
        ...payload,
        duration_days: planMaxDuration !== null ? String(planMaxDuration) : payload.duration_days,
        business: businessId,
        status: "active",
        slug,
        short_code: shortCode,
        ...(autoFeaturedUntil ? { featured_until: autoFeaturedUntil } : {}),
      });
      setCreated({
        id: record.id,
        slug: record.slug as string,
        shortCode: record.short_code as string,
        featuredUntil: autoFeaturedUntil,
      });
      trackEvent("Empresa: aviso publicado");
      emitActivity("job_created", { jobId: record.id });
      try {
        window.localStorage.removeItem(draftKey(mode));
      } catch {
        // ver nota en el efecto de autoguardado
      }
    } catch (err) {
      // PocketBase manda el detalle real de dos formas distintas: por campo
      // en `.response.data` (validación de un field puntual), o un mensaje
      // único en `.response.message` (ej. un límite de plan rechazado por un
      // hook server-side, como "1 búsqueda activa a la vez" -- ver
      // pocketbase/pb_hooks/main.pb.js). Antes se descartaban los dos y
      // quedaba un mensaje genérico que no explicaba qué pasó en ninguno de
      // los dos casos.
      const response = (err as { response?: { message?: string; data?: Record<string, { message?: string }> } })
        ?.response;
      const fieldErrors = response?.data && Object.keys(response.data).length > 0 ? response.data : null;
      console.error("Error al guardar la búsqueda", err);
      if (fieldErrors) {
        const detail = Object.entries(fieldErrors)
          .map(([field, e]) => `${field}: ${e?.message ?? "dato inválido"}`)
          .join(" · ");
        setSubmitError(
          `${mode.kind === "edit" ? "No pudimos guardar los cambios." : "No pudimos crear la búsqueda."} (${detail})`,
        );
      } else if (response?.message) {
        setSubmitError(response.message);
      } else {
        setSubmitError(
          mode.kind === "edit"
            ? "No pudimos guardar los cambios. Probá de nuevo."
            : "No pudimos crear la búsqueda. Revisá los datos e intentá de nuevo.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (created && mode.kind === "create") {
    const publicUrl = `${BASE_URL}/b/${businessSlugFor(businessName)}/${created.shortCode}`;
    return (
      <>
      <Card>
        <h2 className="text-xl font-bold mb-2">¡Tu búsqueda ya está publicada!</h2>
        <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
          Generamos este QR para vos -- pegalo en tu vidriera o mostrador, o compartí el link por
          WhatsApp o Instagram.
        </p>
        <div
          className="text-sm p-3 rounded-[var(--tucv-radius)] break-all mb-4"
          style={{ backgroundColor: "var(--tucv-bg)", border: "1px solid var(--tucv-border)" }}
        >
          {publicUrl}
        </div>
        <div className="mb-5">
          <QRCodeView
            url={publicUrl}
            fileName={created.slug}
            renderFlyer={(qrDataUrl) =>
              generateJobFlyerDataUrl({ role: values.role, businessName, qrDataUrl, logoUrl: businessLogoUrl })
            }
          />
        </div>

        <div
          className="p-3 mb-5 rounded-[var(--tucv-radius)] text-sm space-y-1.5"
          style={{ backgroundColor: "var(--tucv-bg)", border: "2px solid var(--tucv-border)" }}
        >
          <p>
            <span className="font-bold">1.</span> Quien pase por el local escanea el QR con la
            cámara del celular.
          </p>
          <p>
            <span className="font-bold">2.</span> Su postulación te llega al toque -- entrá a
            &quot;Ver postulantes&quot; y la vas a ver ahí, sin recargar la página.
          </p>
          <p>
            <span className="font-bold">3.</span> Filtrá por zona, experiencia y disponibilidad
            para ver primero a quien más te sirve.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          <Button type="button" onClick={() => navigator.clipboard?.writeText(publicUrl)}>
            Copiar link
          </Button>
          <LinkButton href={`/empresa/busquedas/${created.id}`} variant="secondary">
            Ver postulantes
          </LinkButton>
        </div>
        <div className="pt-5" style={{ borderTop: "1.5px solid var(--tucv-border)" }}>
          <p className="text-sm font-semibold mb-3">
            {created.featuredUntil ? "Con tu plan, esta búsqueda ya arrancó destacada." : "¿Querés que se vea primero?"}
          </p>
          <BoostJobButton jobPostId={created.id} featuredUntil={created.featuredUntil} />
        </div>
      </Card>
      <OnboardingCompany
        slug={created.slug}
        shortCode={created.shortCode}
        jobId={created.id}
        role={values.role}
        businessName={businessName}
        businessLogoUrl={businessLogoUrl}
      />
      </>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        {restoredDraft && !draftDismissed && (
          <div
            className="text-sm px-3 py-2 mb-4 rounded-[var(--tucv-radius)] flex items-center justify-between gap-3 flex-wrap"
            style={{ backgroundColor: "var(--tucv-bg)", border: "1.5px solid var(--tucv-border)" }}
          >
            <span>
              {mode.kind === "edit"
                ? "Recuperamos cambios sin guardar de la última vez que editaste esta búsqueda."
                : "Recuperamos lo que habías empezado a completar."}
            </span>
            <button type="button" onClick={discardDraft} className="font-semibold underline shrink-0">
              {mode.kind === "edit" ? "Descartar cambios" : "Empezar de cero"}
            </button>
          </div>
        )}
        <Field label="Rubro" required error={errors.category}>
          <select
            className={inputClass}
            style={inputStyle}
            value={values.category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Elegí una opción</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        {values.category === "otro" && (
          <Field label="¿Qué rubro es?" required error={errors.category_other}>
            <input
              className={inputClass}
              style={inputStyle}
              value={values.category_other}
              onChange={(e) => set("category_other", e.target.value)}
              placeholder="Contanos de qué se trata"
            />
          </Field>
        )}

        <Field
          label="Puesto"
          required
          error={errors.role}
          hint="Esto es lo que va a ver la gente como título de la búsqueda."
        >
          <input
            className={inputClass}
            style={inputStyle}
            value={values.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="Cajero/a"
          />
        </Field>

        {ROLE_SUGGESTIONS_BY_CATEGORY[values.category]?.length > 0 && (
          <div className="-mt-2 mb-4 flex flex-wrap gap-2">
            {ROLE_SUGGESTIONS_BY_CATEGORY[values.category].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => set("role", suggestion)}
                className="text-xs px-2.5 py-1 rounded-[var(--tucv-radius)] border-2 transition"
                style={{
                  backgroundColor: values.role === suggestion ? "var(--tucv-accent)" : "var(--tucv-surface)",
                  color: "var(--tucv-text)",
                  borderColor: "var(--tucv-border)",
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {values.category && (
          <Field label="Tareas principales (opcional)" hint="Ayuda a que se postule quien realmente sabe hacer esto.">
            <ChipMultiSelect
              options={taskSuggestionsFor(values.category)}
              value={values.main_tasks}
              onChange={(v) => set("main_tasks", v)}
            />
          </Field>
        )}

        <Field label="Dirección / zona" required error={errors.address_zone}>
          <AddressAutocomplete
            value={values.address_zone}
            onChange={(v) => set("address_zone", v)}
            onSelectDetails={(d) => setValues((v) => ({ ...v, city: d.city, province: d.province, country: d.country }))}
            placeholder="Av. Santa Fe 3200, Palermo"
          />
        </Field>

        <Field label="Turno" required error={errors.shift}>
          <ChipMultiSelect options={AVAILABILITY} value={values.shift} onChange={(v) => set("shift", v)} />
        </Field>

        <Field label="Días (opcional)">
          <SingleChipSelect
            options={DAY_PATTERNS}
            value={values.schedule_days}
            onChange={(v) => set("schedule_days", v)}
          />
        </Field>

        <Field label="Horario aproximado (opcional)" hint="Tocá una sugerencia o escribí la tuya y sumala.">
          <div className="flex flex-wrap gap-2 mb-2">
            {SCHEDULE_HOURS_SUGGESTIONS.filter((s) => !values.schedule_hours.includes(s)).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("schedule_hours", [...values.schedule_hours, s])}
                className="text-xs px-2.5 py-1 rounded-[var(--tucv-radius)] border-2 transition"
                style={{ backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)", borderColor: "var(--tucv-border)" }}
              >
                + {s}
              </button>
            ))}
          </div>
          <TagInput
            value={values.schedule_hours}
            onChange={(v) => set("schedule_hours", v)}
            placeholder="Ej: 8 a 16hs"
            addLabel="Agregar"
          />
        </Field>

        <Field label="Cantidad de vacantes (opcional)">
          <select
            className={inputClass}
            style={inputStyle}
            value={values.vacancies}
            onChange={(e) => set("vacancies", e.target.value)}
          >
            <option value="">Elegí una opción</option>
            {VACANCIES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Experiencia requerida" required error={errors.experience_required}>
          <select
            className={inputClass}
            style={inputStyle}
            value={values.experience_required}
            onChange={(e) => set("experience_required", e.target.value)}
          >
            <option value="">Elegí una opción</option>
            {EXPERIENCE.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        {/* Programas laborales: no es un requisito del puesto ni un beneficio
            -- es una condición de contratación / compatibilidad, por eso va
            entre "Experiencia requerida" y "Condiciones y beneficios". La
            empresa publica una búsqueda normal; esto es una capa que TuCV
            agrega encima, nunca "busco gente con plan". */}
        <div
          className="rounded-[var(--tucv-radius)] border-2 p-4 sm:p-5 space-y-4"
          style={{ borderColor: "var(--tucv-border)", backgroundColor: "var(--tucv-bg)" }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: "var(--tucv-text)" }}>
              Programas públicos de empleo{" "}
              <span className="font-normal" style={{ color: "var(--tucv-muted)" }}>
                (opcional)
              </span>
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--tucv-muted)" }}>
              Si aceptás incorporar por programas como PPP, Empleo +26, PIL o EPT, TuCV detecta
              postulantes compatibles según zona, edad y situación laboral.
            </p>
          </div>

          <Field label="¿Querés recibir candidatos compatibles con programas de empleo?">
            <SingleChipSelect
              options={PROGRAM_MODE}
              value={values.programs_mode}
              onChange={(v) => set("programs_mode", v || "none")}
            />
            {values.programs_mode === "prioritize" && !canPrioritizePrograms && (
              <p className="text-xs mt-2 font-medium" style={{ color: "var(--tucv-accent)" }}>
                Priorizar y ordenar compatibles arriba es parte de Pro. Se guarda como
                &ldquo;acepto candidatos compatibles&rdquo;; pasá a Pro para priorizarlos.
              </p>
            )}
          </Field>

          {wantsPrograms && (
            <>
              {suggestedPrograms.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: "var(--tucv-muted)" }}>
                    Por tu zona podrían aplicar:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedPrograms.map((id) => (
                      <span
                        key={id}
                        className="text-xs px-2.5 py-1 rounded-[var(--tucv-radius)] border-2"
                        style={{
                          borderColor: "var(--tucv-border)",
                          color: "var(--tucv-text)",
                          backgroundColor: "var(--tucv-surface)",
                        }}
                      >
                        {programById(id).shortLabel}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <Field label="Interés principal (opcional)">
                <ChipMultiSelect
                  options={PROGRAM_INTEREST}
                  value={values.programs_interest}
                  onChange={(v) => set("programs_interest", v)}
                />
              </Field>

              <Field label="Visibilidad">
                <ChipMultiSelect
                  options={visibilityOptions}
                  value={values.programs_visibility}
                  onChange={(v) => set("programs_visibility", v)}
                />
              </Field>

              <p className="text-xs" style={{ color: "var(--tucv-muted)" }}>
                {PROGRAMS_DISCLAIMER}
              </p>
            </>
          )}

          {values.programs_mode === "need_help" && (
            <div
              className="rounded-[var(--tucv-radius)] p-3 text-sm"
              style={{ backgroundColor: "var(--tucv-surface)", color: "var(--tucv-text)" }}
            >
              Anotamos que querés ayuda. TuCV te va a contactar para detectar candidatos
              compatibles y entender qué programa aplica según tu zona y el puesto.
            </div>
          )}
        </div>

        <Field
          label="Condiciones y beneficios (opcional)"
          hint={
            hidesExtraChips(plan)
              ? "Con el plan gratis no se muestran en el link público -- se guardan igual, por si pasás a Pro después."
              : "Se muestran en el link público, ayuda a que se postule quien realmente le sirve."
          }
        >
          <ChipMultiSelect options={JOB_PERKS} value={values.perks} onChange={(v) => set("perks", v)} />
        </Field>

        <Field
          label="Requisitos obligatorios (opcional)"
          hint={
            hidesExtraChips(plan)
              ? "Con el plan gratis no se muestran en el link público -- se guardan igual, por si pasás a Pro después."
              : "Solo lo imprescindible -- se muestra en el link público."
          }
        >
          <ChipMultiSelect
            options={HARD_REQUIREMENTS}
            value={values.hard_requirements}
            onChange={(v) => set("hard_requirements", v)}
          />
        </Field>

        <Field label="Sueldo (opcional)" hint="No es obligatorio publicarlo.">
          <select
            className={inputClass}
            style={inputStyle}
            value={values.salary_mode}
            onChange={(e) => set("salary_mode", e.target.value)}
          >
            <option value="">Elegí una opción</option>
            {SALARY_MODE.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </Field>

        {values.salary_mode === "mostrar" && (
          <Field label="Monto o rango" required error={errors.salary_amount}>
            <ThousandsInput
              className={inputClass}
              style={inputStyle}
              value={values.salary_amount}
              onChange={(v) => set("salary_amount", v)}
              placeholder="$800.000 - $900.000"
            />
          </Field>
        )}

        <Field
          label="Preguntas filtro (opcional)"
          hint="Hasta 5. Las de Sí/No suman puntos para ordenar el panel de postulantes; las de respuesta libre son solo para leer."
        >
          <ScreeningQuestionsEditor
            questions={values.screening_questions}
            onChange={(v) => set("screening_questions", v)}
          />
        </Field>

        <Field label="Mensaje visible (opcional)" hint="Lo van a ver los postulantes en el link público. Podés poner negrita, subrayado, tamaño y alineación.">
          <RichTextEditor
            value={values.visible_message}
            onChange={(html) => set("visible_message", html)}
            placeholder="Buscamos alguien con buena predisposición para atender al público los fines de semana."
          />
        </Field>

        {lockedDuration !== null ? (
          <Field label="Duración de la búsqueda">
            <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
              {lockedDuration} días con el plan gratis.{" "}
              <a
                href="/precios"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
                style={{ color: "var(--tucv-primary)" }}
              >
                Con Pro dura más
              </a>{" "}
              (se abre en otra pestaña, no perdés lo que ya completaste acá).
            </p>
          </Field>
        ) : (
          <Field label="Duración de la búsqueda" required>
            <select
              className={inputClass}
              style={inputStyle}
              value={values.duration_days}
              onChange={(e) => set("duration_days", e.target.value)}
            >
              {DURATION_DAYS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        {submitError && (
          <p className="text-sm mb-3 font-medium" style={{ color: "#DC2626" }}>
            {submitError}
          </p>
        )}

        {saved && (
          <div
            className="text-sm font-semibold px-3 py-2 mb-3 rounded-[var(--tucv-radius)] flex items-center gap-2"
            style={{ backgroundColor: "#DCFCE7", color: "#128C4A", border: "1.5px solid #128C4A" }}
          >
            <span>✓</span>
            <span>Listo, guardamos los cambios.</span>
          </div>
        )}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting
            ? mode.kind === "edit"
              ? "Guardando..."
              : "Publicando..."
            : mode.kind === "edit"
              ? "Guardar cambios"
              : "Publicar búsqueda"}
        </Button>
      </Card>
    </form>
  );
}
