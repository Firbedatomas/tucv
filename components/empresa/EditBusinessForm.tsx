"use client";

import { useState } from "react";
import { pb } from "@/lib/pocketbase";
import type { BusinessRecord } from "@/lib/use-business-auth";
import { resizeImageFile } from "@/lib/image-resize";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { PhotoUpload } from "@/components/ui/PhotoUpload";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// No había ninguna forma de corregir el teléfono/zona/nombre después del
// registro inicial -- el negocio quedaba pegado con lo que cargó una vez.
export function EditBusinessForm({ business }: { business: BusinessRecord }) {
  const [values, setValues] = useState({
    contact_name: business.contact_name,
    business_name: business.business_name,
    phone: business.phone,
    city_zone: business.city_zone,
    website: business.website,
    instagram: business.instagram,
    bio: business.bio,
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(business.logoUrl);
  const [resizingLogo, setResizingLogo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setSaved(false);
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
    setSaved(false);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!values.contact_name.trim()) e.contact_name = "Ingresá tu nombre.";
    if (!values.business_name.trim()) e.business_name = "Ingresá el nombre del negocio.";
    if (!values.phone.trim()) e.phone = "Ingresá un teléfono de contacto.";
    if (!values.city_zone.trim()) e.city_zone = "Ingresá la zona.";
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
      formData.append("contact_name", values.contact_name.trim());
      formData.append("business_name", values.business_name.trim());
      formData.append("phone", values.phone.trim());
      formData.append("city_zone", values.city_zone.trim());
      formData.append("website", values.website.trim());
      formData.append("instagram", values.instagram.trim());
      formData.append("bio", values.bio.trim());
      if (logo) formData.append("logo", logo);
      await pb().collection("business_accounts").update(business.id, formData);
      setSaved(true);
    } catch {
      setSubmitError("No pudimos guardar los cambios. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

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
          />
        </Field>
        <Field label="Nombre del negocio" required error={errors.business_name}>
          <input
            className={inputClass}
            style={inputStyle}
            value={values.business_name}
            onChange={(e) => set("business_name", e.target.value)}
          />
        </Field>
        <Field
          label="Descripción del negocio (opcional)"
          hint="Contá de qué se trata -- ayuda a que quien vea la búsqueda sepa con quién está hablando."
        >
          <textarea
            className={inputClass}
            style={inputStyle}
            rows={3}
            maxLength={400}
            value={values.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Somos una cadena de cafeterías con 4 locales en Almagro y Caballito."
          />
        </Field>
        <Field label="Teléfono de contacto" required error={errors.phone}>
          <input
            className={inputClass}
            style={inputStyle}
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            inputMode="tel"
          />
        </Field>
        <Field label="Zona" required error={errors.city_zone}>
          <AddressAutocomplete value={values.city_zone} onChange={(v) => set("city_zone", v)} />
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
        {submitError && (
          <p className="text-sm mb-3 font-medium" style={{ color: "#DC2626" }}>
            {submitError}
          </p>
        )}
        {saved && (
          // Antes era un texto chico al lado del botón -- pasaba
          // desapercibido y quedaba la sensación de que "no se guardó" aunque
          // sí. Un banner con el mismo peso que el de error es mucho más
          // difícil de no ver.
          <div
            className="text-sm font-semibold px-3 py-2 mb-3 rounded-[var(--tucv-radius)] flex items-center gap-2"
            style={{ backgroundColor: "#DCFCE7", color: "#128C4A", border: "1.5px solid #128C4A" }}
          >
            <span>✓</span>
            <span>Listo, guardamos los cambios.</span>
          </div>
        )}
        <Button type="submit" disabled={submitting || resizingLogo}>
          {submitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </Card>
    </form>
  );
}
