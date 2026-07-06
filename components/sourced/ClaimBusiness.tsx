"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { resolveBusinessAccess } from "@/lib/business-access";
import { trySetAdminSession } from "@/lib/admin-login-check";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, inputStyle } from "@/components/ui/Field";

type Step = "loading" | "need_login" | "have_business" | "need_business" | "done";

export function ClaimBusiness({
  sourcedId,
  name,
  cityZone,
  jobCount,
}: {
  sourcedId: string;
  name: string;
  cityZone: string;
  jobCount: number;
}) {
  const [step, setStep] = useState<Step>("loading");
  const [existingBiz, setExistingBiz] = useState<{ id: string; business_name: string } | null>(null);
  const [values, setValues] = useState({ business_name: name, phone: "", city_zone: cityZone });
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ascended, setAscended] = useState(0);

  async function refresh() {
    const client = pb();
    if (!client.authStore.isValid) {
      setStep("need_login");
      return;
    }
    const userId = client.authStore.record?.id;
    const access = userId ? await resolveBusinessAccess(client, userId).catch(() => null) : null;
    if (access) {
      setExistingBiz({ id: access.business.id, business_name: access.business.business_name });
      setStep("have_business");
    } else {
      setStep("need_business");
    }
  }

  useEffect(() => {
    // Chequeo de sesión al montar (una vez); los setState van tras el await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, []);

  async function login() {
    setBusy(true);
    setError("");
    try {
      await pb().collection("users").authWithOAuth2({ provider: "google" });
      // El admin no reclama empresas; si lo es, lo mandamos a /admin.
      if (await trySetAdminSession(pb().authStore.token)) {
        window.location.href = "/admin";
        return;
      }
      await refresh();
    } catch {
      setError("No pudimos iniciar sesión. Probá de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function claim(businessAccountId: string) {
    const res = await fetch("/api/sourced-claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourcedBusinessId: sourcedId, businessAccountId, token: pb().authStore.token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No pudimos completar el reclamo.");
    setAscended(data.ascended ?? 0);
    setStep("done");
  }

  async function claimWithExisting() {
    if (!existingBiz) return;
    setBusy(true);
    setError("");
    try {
      await claim(existingBiz.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error.");
    } finally {
      setBusy(false);
    }
  }

  async function createAndClaim(ev: React.FormEvent) {
    ev.preventDefault();
    setError("");
    if (!values.business_name.trim() || !values.phone.trim() || !values.city_zone.trim()) {
      setError("Completá nombre, teléfono y zona.");
      return;
    }
    if (!terms) {
      setError("Aceptá los Términos para continuar.");
      return;
    }
    setBusy(true);
    try {
      const userId = pb().authStore.record?.id;
      const rec = await pb()
        .collection("business_accounts")
        .create({
          user: userId,
          contact_name: pb().authStore.record?.name || values.business_name.trim(),
          business_name: values.business_name.trim(),
          phone: values.phone.trim(),
          city_zone: values.city_zone.trim(),
          terms_accepted: true,
        });
      await claim(rec.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos crear tu cuenta.");
      setBusy(false);
    }
  }

  if (step === "loading") {
    return <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>Cargando...</p>;
  }

  if (step === "done") {
    return (
      <Card>
        <p className="font-bold text-lg mb-1" style={{ color: "#12854A" }}>¡Listo, {name} es tuya! ✓</p>
        <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
          {ascended > 0
            ? `Pasamos ${ascended} búsqueda${ascended > 1 ? "s" : ""} detectada${ascended > 1 ? "s" : ""} a tu panel como borrador. Revisalas, completalas y publicalas.`
            : "Ya podés publicar tu primera búsqueda desde el panel."}
        </p>
        {/* Hard-nav: el Navbar se montó con isAuthenticated=true pero sin
            business todavía; una recarga lo hace ver la cuenta nueva (mismo
            caso que RegistroForm). */}
        <Button type="button" onClick={() => { window.location.href = "/empresa/panel"; }}>
          Ir a mi panel
        </Button>
      </Card>
    );
  }

  if (step === "need_login") {
    return (
      <Card>
        <p className="text-sm mb-4" style={{ color: "var(--tucv-text)" }}>
          Ingresá con Google para confirmar que sos el dueño y reclamar la página.
        </p>
        <GoogleButton onClick={login} disabled={busy} label={busy ? "Conectando..." : "Ingresar con Google"} />
        {error && <p className="text-sm mt-3" style={{ color: "var(--tucv-primary)" }}>{error}</p>}
      </Card>
    );
  }

  if (step === "have_business") {
    return (
      <Card>
        <p className="text-sm mb-4" style={{ color: "var(--tucv-text)" }}>
          Vas a reclamar <strong>{name}</strong> con tu empresa <strong>{existingBiz?.business_name}</strong>.
          {jobCount > 0 ? ` Sus ${jobCount} búsqueda${jobCount > 1 ? "s" : ""} detectada${jobCount > 1 ? "s" : ""} pasan a tu panel como borrador.` : ""}
        </p>
        <Button type="button" onClick={claimWithExisting} disabled={busy}>
          {busy ? "Reclamando..." : "Reclamar esta empresa"}
        </Button>
        {error && <p className="text-sm mt-3" style={{ color: "var(--tucv-primary)" }}>{error}</p>}
      </Card>
    );
  }

  // need_business: crear la cuenta (pre-llenada) y reclamar
  return (
    <Card>
      <form onSubmit={createAndClaim} className="space-y-3" noValidate>
        <Field label="Nombre del negocio">
          <input className={inputClass} style={inputStyle} value={values.business_name} onChange={(e) => setValues((v) => ({ ...v, business_name: e.target.value }))} />
        </Field>
        <Field label="Teléfono / WhatsApp">
          <input className={inputClass} style={inputStyle} value={values.phone} placeholder="Ej: 351 555 5555" onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} />
        </Field>
        <Field label="Zona">
          <input className={inputClass} style={inputStyle} value={values.city_zone} onChange={(e) => setValues((v) => ({ ...v, city_zone: e.target.value }))} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1" />
          <span>
            Confirmo que soy el dueño o represento a este negocio y acepto los{" "}
            <a href="/terminos" className="underline" target="_blank" rel="noopener noreferrer">Términos</a> y la{" "}
            <a href="/privacidad" className="underline" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>.
          </span>
        </label>
        {error && <p className="text-sm" style={{ color: "var(--tucv-primary)" }}>{error}</p>}
        <Button type="submit" disabled={busy}>
          {busy ? "Reclamando..." : "Reclamar y crear mi cuenta"}
        </Button>
      </form>
    </Card>
  );
}
