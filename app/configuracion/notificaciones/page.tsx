"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { inputClass, inputStyle } from "@/components/ui/Field";

type Prefs = {
  id: string;
  applicationsFrequency: "instant" | "daily" | "never";
  companyDigestFrequency: "daily" | "weekly" | "never";
  profileViewsFrequency: "weekly" | "never";
  profileTips: boolean;
  marketing: boolean;
};

// Comparte esta pantalla entre postulante y empresa a propósito (misma
// colección `users`, mismo notification_preferences.user) -- requireRole:
// false porque acá solo hace falta que HAYA sesión, no un rol específico.
export default function NotificacionesPage() {
  const { isAuthenticated, userId } = usePostulanteAuth({ redirectIfLoggedOut: true, requireRole: false });
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const client = pb();
    client
      .collection("notification_preferences")
      .getFirstListItem(`user="${userId}"`, { requestKey: null })
      .then((record) =>
        setPrefs({
          id: record.id,
          applicationsFrequency: record.applications_frequency || "instant",
          companyDigestFrequency: record.company_digest_frequency || "daily",
          profileViewsFrequency: record.profile_views_frequency || "weekly",
          profileTips: record.profile_tips !== false,
          marketing: record.marketing === true,
        }),
      )
      .catch(() => {
        // Cuenta creada antes de que existiera el hook que arma esta fila
        // sola -- la creamos server-side con defaults (ver
        // app/api/notification-preferences/route.ts).
        fetch("/api/notification-preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: client.authStore.token }),
        })
          .then((r) => r.json())
          .then((record) =>
            setPrefs({
              id: record.id,
              applicationsFrequency: record.applicationsFrequency,
              companyDigestFrequency: record.companyDigestFrequency,
              profileViewsFrequency: record.profileViewsFrequency,
              profileTips: record.profileTips,
              marketing: record.marketing,
            }),
          )
          .catch(() => {});
      });
  }, [isAuthenticated, userId]);

  async function save(next: Prefs) {
    setPrefs(next);
    setSaving(true);
    setSaved(false);
    try {
      await pb().collection("notification_preferences").update(next.id, {
        applications_frequency: next.applicationsFrequency,
        company_digest_frequency: next.companyDigestFrequency,
        profile_views_frequency: next.profileViewsFrequency,
        profile_tips: next.profileTips,
        marketing: next.marketing,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) {
    return (
      <main className="flex-1 px-4 py-10 sm:py-14">
        <div className="max-w-lg mx-auto">
          <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>
            Cargando tus preferencias...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-1">Preferencias de notificación</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Los emails de seguridad de tu cuenta no se desactivan acá. Todo lo demás sí.
        </p>

        <Card className="flex flex-col gap-1">
          <Field label="Postulaciones" hint="Cuando te postulás a algo, o cuando alguien se postula a tu búsqueda.">
            <select
              className={inputClass}
              style={inputStyle}
              value={prefs.applicationsFrequency}
              onChange={(e) => save({ ...prefs, applicationsFrequency: e.target.value as Prefs["applicationsFrequency"] })}
            >
              <option value="instant">Al instante</option>
              <option value="daily">Resumen diario (empresas: llega en el &quot;Impacto diario&quot; de abajo)</option>
              <option value="never">Nunca</option>
            </select>
          </Field>

          <Field label="Resumen de actividad (empresas)" hint="Resumen de nuevos postulantes en tus búsquedas activas.">
            <select
              className={inputClass}
              style={inputStyle}
              value={prefs.companyDigestFrequency}
              onChange={(e) => save({ ...prefs, companyDigestFrequency: e.target.value as Prefs["companyDigestFrequency"] })}
            >
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="never">Nunca</option>
            </select>
          </Field>

          <Field label="Visitas a tu perfil (postulantes)" hint="Resumen semanal de cuánta gente vio tu perfil.">
            <select
              className={inputClass}
              style={inputStyle}
              value={prefs.profileViewsFrequency}
              onChange={(e) => save({ ...prefs, profileViewsFrequency: e.target.value as Prefs["profileViewsFrequency"] })}
            >
              <option value="weekly">Semanal</option>
              <option value="never">Nunca</option>
            </select>
          </Field>

          <label className="flex items-center gap-2 text-sm mt-2">
            <input type="checkbox" checked={prefs.profileTips} onChange={(e) => save({ ...prefs, profileTips: e.target.checked })} />
            Consejos para mejorar mi perfil
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prefs.marketing} onChange={(e) => save({ ...prefs, marketing: e.target.checked })} />
            Novedades de TuCV
          </label>

          <div className="mt-3 h-5">
            {saving && (
              <span className="text-xs" style={{ color: "var(--tucv-muted)" }}>
                Guardando...
              </span>
            )}
            {saved && !saving && <span className="text-xs font-semibold" style={{ color: "#128C4A" }}>Guardado</span>}
          </div>
        </Card>
      </div>
    </main>
  );
}
