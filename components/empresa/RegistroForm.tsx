"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { useBusinessAuth } from "@/lib/use-business-auth";
import { resolveBusinessAccess } from "@/lib/business-access";
import { consumeGoogleProfile } from "@/lib/google-profile-stash";
import { resizeImageFile } from "@/lib/image-resize";
import { trackEvent } from "@/lib/track";
import { emitConversion } from "@/lib/emit-activity";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function RegistroForm() {
  const router = useRouter();
  const { isAuthenticated, userId } = useBusinessAuth({ requireRole: false });
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [values, setValues] = useState({
    contact_name: "",
    business_name: "",
    phone: "",
    city_zone: "",
    city: "",
    province: "",
    country: "",
    website: "",
    instagram: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [resizingLogo, setResizingLogo] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Chequea dueño Y miembro invitado -- si no se hiciera así, alguien que ya
  // es colaborador de un negocio (business_members) podría crear el suyo
  // propio acá y terminar con dos relaciones a la vez, algo que el modelo
  // actual no soporta (ver lib/business-access.ts).
  useEffect(() => {
    if (!userId) return;
    resolveBusinessAccess(pb(), userId)
      .then((access) => {
        if (access) router.replace("/empresa/panel");
        else setCheckingExisting(false);
      })
      .catch(() => setCheckingExisting(false));
  }, [userId, router]);

  // Nombre de contacto: lo trae Google, pero queda editable -- una cuenta
  // puede tener el nombre mal cargado, o la persona que gestiona el negocio
  // puede no ser la dueña de esa cuenta de Google.
  useEffect(() => {
    const hint = consumeGoogleProfile();
    if (hint?.name) set("contact_name", hint.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleLogoChange(file: File | null) {
    if (!file) return;
    setResizingLogo(true);
    try {
      const resized = await resizeImageFile(file);
      setLogo(resized);
      setLogoPreview(URL.createObjectURL(resized));
    } catch {
      setLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    } finally {
      setResizingLogo(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!values.contact_name.trim()) e.contact_name = "Ingresá tu nombre.";
    if (!values.business_name.trim()) e.business_name = "Ingresá el nombre del negocio.";
    if (!values.phone.trim()) e.phone = "Ingresá un teléfono de contacto.";
    if (!values.city_zone.trim()) e.city_zone = "Ingresá la zona.";
    if (!termsAccepted) e.terms_accepted = "Tenés que aceptar los Términos y la Política de Privacidad para continuar.";
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
      const formData = new FormData();
      formData.append("user", userId ?? "");
      formData.append("contact_name", values.contact_name.trim());
      formData.append("business_name", values.business_name.trim());
      formData.append("phone", values.phone.trim());
      formData.append("city_zone", values.city_zone.trim());
      formData.append("city", values.city);
      formData.append("province", values.province);
      formData.append("country", values.country);
      formData.append("website", values.website.trim());
      formData.append("instagram", values.instagram.trim());
      formData.append("terms_accepted", String(termsAccepted));
      if (logo) formData.append("logo", logo);
      await pb().collection("business_accounts").create(formData);
      trackEvent("Empresa: registro completado");
      emitConversion("company_registered");
      // Recarga dura a propósito (no router.push): el Navbar ya está montado
      // desde antes de crear el negocio, con isAuthenticated=true pero sin
      // business_accounts todavía. Su chequeo de "hasBusiness" solo corre
      // cuando isAuthenticated pasa de false a true -- como acá ya era true,
      // nunca se entera de que el negocio se acaba de crear y se queda
      // mostrando el nav de postulante hasta un reload. Es la única
      // transición del flujo donde vale la pena perder la navegación SPA.
      window.location.href = "/empresa/panel";
      return;
    } catch {
      setSubmitError("No pudimos guardar los datos de tu negocio. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  if (!isAuthenticated || checkingExisting) return null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <Field label="Logo del negocio (opcional)" hint="Se muestra en tu link público y en el panel.">
          <PhotoUpload previewUrl={logoPreview} onFileSelected={handleLogoChange} processing={resizingLogo} />
        </Field>

        <Field label="Tu nombre" required error={errors.contact_name}>
          <input
            className={inputClass}
            style={inputStyle}
            value={values.contact_name}
            onChange={(e) => set("contact_name", e.target.value)}
            placeholder="María Gómez"
          />
        </Field>
        <Field label="Nombre del negocio" required error={errors.business_name}>
          <input
            className={inputClass}
            style={inputStyle}
            value={values.business_name}
            onChange={(e) => set("business_name", e.target.value)}
            placeholder="Almacén Don José"
          />
        </Field>
        <Field label="Teléfono de contacto" required error={errors.phone}>
          <input
            className={inputClass}
            style={inputStyle}
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="11 2233 4455"
            inputMode="tel"
          />
        </Field>
        <Field label="Zona" required error={errors.city_zone}>
          <AddressAutocomplete
            value={values.city_zone}
            onChange={(v) => set("city_zone", v)}
            onSelectDetails={(d) => setValues((v) => ({ ...v, city: d.city, province: d.province, country: d.country }))}
            placeholder="Palermo, CABA"
          />
        </Field>
        <Field label="Sitio web (opcional)" hint="Se muestra en el link público de tus búsquedas.">
          <input
            className={inputClass}
            style={inputStyle}
            value={values.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://tunegocio.com.ar"
            inputMode="url"
          />
        </Field>
        <Field label="Instagram (opcional)">
          <input
            className={inputClass}
            style={inputStyle}
            value={values.instagram}
            onChange={(e) => set("instagram", e.target.value)}
            placeholder="@tunegocio o instagram.com/tunegocio"
          />
        </Field>
        <label className="flex items-start gap-2 mb-3 text-sm" data-field="terms_accepted">
          <input
            type="checkbox"
            className="mt-1"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            Acepto los{" "}
            <a href="/terminos" target="_blank" rel="noopener noreferrer" className="underline">
              Términos
            </a>{" "}
            y la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="underline">
              Política de Privacidad
            </a>{" "}
            de TuCV.
            {errors.terms_accepted && (
              <span className="block text-xs mt-1 font-medium" style={{ color: "#DC2626" }}>
                {errors.terms_accepted}
              </span>
            )}
          </span>
        </label>
        {submitError && (
          <p className="text-sm mb-3 font-medium" style={{ color: "#DC2626" }}>
            {submitError}
          </p>
        )}
        <Button type="submit" disabled={submitting || resizingLogo} className="w-full">
          {submitting ? "Guardando..." : "Guardar y continuar"}
        </Button>
      </Card>
    </form>
  );
}
