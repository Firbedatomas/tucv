"use client";

import { useEffect, useState } from "react";
import { pb } from "@/lib/pocketbase";
import { usePostulanteAuth } from "@/lib/use-postulante-auth";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";

type PrivacyFields = {
  consent_public_profile: boolean;
  consent_zone_visible: boolean;
  consent_contact: boolean;
  allow_invitations: boolean;
  allow_recommendations: boolean;
  show_references: boolean;
};

type Row = {
  key: keyof PrivacyFields;
  label: string;
  desc: string;
  dependsOn?: keyof PrivacyFields;
};

const ROWS: Row[] = [
  {
    key: "consent_public_profile",
    label: "Perfil público",
    desc: "Aparecés en el directorio abierto y tenés link público. Nunca mostramos tu WhatsApp, DNI, email ni fecha de nacimiento.",
  },
  {
    key: "consent_zone_visible",
    label: "Visible para empresas",
    desc: "Las empresas de tu zona te ven en su búsqueda de candidatos, aunque no te hayas postulado.",
  },
  {
    key: "consent_contact",
    label: "Permitir contacto directo",
    desc: "Las empresas pueden ver tu WhatsApp desde tu perfil. Requiere estar visible para empresas.",
    dependsOn: "consent_zone_visible",
  },
  {
    key: "allow_invitations",
    label: "Permitir invitaciones de empresas",
    desc: "Las empresas pueden invitarte a postularte a sus búsquedas. Vos decidís si aceptás.",
  },
  {
    key: "allow_recommendations",
    label: "Permitir recomendaciones",
    desc: "Otros usuarios pueden dejarte un aval. Siempre aprobás vos qué se muestra en tu perfil.",
  },
  {
    key: "show_references",
    label: "Mostrar referencias en mi perfil",
    desc: "El resumen de tus referencias aprobadas aparece en tu perfil público.",
  },
];

function PrivacidadContent() {
  const { isAuthenticated, userId } = usePostulanteAuth({ requireRole: false });
  const [state, setState] = useState<
    { status: "loading" } | { status: "not-found" } | { status: "ready"; id: string; values: PrivacyFields }
  >({ status: "loading" });

  useEffect(() => {
    if (!userId) return;
    pb()
      .collection("candidate_profiles")
      .getFirstListItem(`user="${userId}"`, { requestKey: null })
      .then((r) =>
        setState({
          status: "ready",
          id: r.id,
          values: {
            consent_public_profile: !!r.consent_public_profile,
            consent_zone_visible: !!r.consent_zone_visible,
            consent_contact: !!r.consent_contact,
            allow_invitations: r.allow_invitations ?? true,
            allow_recommendations: r.allow_recommendations ?? true,
            show_references: r.show_references ?? true,
          },
        }),
      )
      .catch(() => setState({ status: "not-found" }));
  }, [userId]);

  async function toggle(key: keyof PrivacyFields, value: boolean) {
    if (state.status !== "ready") return;
    const next = { ...state.values, [key]: value };
    // Contacto directo no tiene sentido sin ser visible para empresas.
    if (key === "consent_zone_visible" && !value) next.consent_contact = false;
    setState({ ...state, values: next });
    try {
      const patch: Partial<PrivacyFields> = { [key]: value };
      if (key === "consent_zone_visible" && !value) patch.consent_contact = false;
      await pb().collection("candidate_profiles").update(state.id, patch);
    } catch {
      setState((s) => (s.status === "ready" ? { ...s, values: state.values } : s));
    }
  }

  if (!isAuthenticated) return null;
  if (state.status === "loading") {
    return <p className="text-sm" style={{ color: "var(--tucv-muted)" }}>Cargando...</p>;
  }
  if (state.status === "not-found") {
    return (
      <Card>
        <h2 className="font-bold mb-2">Todavía no creaste tu perfil</h2>
        <LinkButton href="/postulante/nuevo">Crear mi perfil</LinkButton>
      </Card>
    );
  }

  const { values } = state;
  return (
    <Card>
      <div className="divide-y" style={{ borderColor: "var(--tucv-border)" }}>
        {ROWS.map((row) => {
          const disabled = row.dependsOn ? !values[row.dependsOn] : false;
          const checked = disabled ? false : values[row.key];
          return (
            <label
              key={row.key}
              className="flex items-start justify-between gap-4 py-4 cursor-pointer"
              style={{ opacity: disabled ? 0.55 : 1 }}
            >
              <span className="min-w-0">
                <span className="block font-semibold text-sm">{row.label}</span>
                <span className="block text-xs mt-0.5" style={{ color: "var(--tucv-muted)" }}>
                  {row.desc}
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 w-5 h-5 shrink-0"
                disabled={disabled}
                checked={checked}
                onChange={(e) => toggle(row.key, e.target.checked)}
              />
            </label>
          );
        })}
      </div>
    </Card>
  );
}

export default function PrivacidadPage() {
  return (
    <main className="flex-1 px-4 py-10 sm:py-14">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Privacidad</h1>
        <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
          Vos controlás quién te ve y quién puede contactarte. Cada cambio se guarda solo.
        </p>
        <PrivacidadContent />
      </div>
    </main>
  );
}
