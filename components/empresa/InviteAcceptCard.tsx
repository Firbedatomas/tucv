"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Card } from "@/components/ui/Card";

type LookupState =
  | { kind: "loading" }
  | { kind: "ready"; businessName: string }
  | { kind: "error"; message: string };

const LOOKUP_ERROR_MESSAGES: Record<string, string> = {
  not_found: "No encontramos esa invitación. Puede que el link esté mal copiado.",
  expired: "Esta invitación venció. Pedile al negocio que te mande una nueva.",
  already_used: "Esta invitación ya se usó.",
};

const ACCEPT_ERROR_MESSAGES: Record<string, string> = {
  expired_or_used: "Esta invitación venció o ya se usó.",
  already_has_business: "Esa cuenta de Google ya está asociada a otro negocio en TuCV. Iniciá sesión con otra cuenta de Google para aceptar esta invitación.",
};

export function InviteAcceptCard({ token }: { token: string }) {
  const router = useRouter();
  const [lookup, setLookup] = useState<LookupState>({ kind: "loading" });
  const [submitting, setSubmitting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/business-invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "not_found");
        setLookup({ kind: "ready", businessName: data.businessName });
      })
      .catch((err) => {
        const message = LOOKUP_ERROR_MESSAGES[err.message] || "No pudimos abrir esta invitación.";
        setLookup({ kind: "error", message });
      });
  }, [token]);

  async function handleAccept() {
    setSubmitting(true);
    setAcceptError(null);
    try {
      const client = pb();
      await client.collection("users").authWithOAuth2({ provider: "google" });
      const pbToken = client.authStore.token;
      const res = await fetch(`/api/business-invites/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pbToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "email_mismatch") {
          setAcceptError(`Esta invitación es para ${data.invitedEmail}. Iniciá sesión con esa cuenta de Google.`);
        } else {
          setAcceptError(ACCEPT_ERROR_MESSAGES[data.error] || "No pudimos aceptar la invitación. Probá de nuevo.");
        }
        setSubmitting(false);
        return;
      }
      router.push("/empresa/panel");
    } catch {
      setAcceptError("No pudimos iniciar sesión con Google. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  if (lookup.kind === "loading") return <Card>Cargando invitación...</Card>;

  if (lookup.kind === "error") {
    return (
      <Card>
        <p className="text-sm font-medium" style={{ color: "#DC2626" }}>
          {lookup.message}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="text-xl font-bold mb-2">
        Te invitaron a sumarte a <span style={{ color: "var(--tucv-primary)" }}>{lookup.businessName}</span>
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--tucv-muted)" }}>
        Vas a poder ver sus búsquedas activas y revisar postulantes. No vas a poder editar búsquedas ni tocar el plan
        o los datos del negocio.
      </p>
      <GoogleButton
        onClick={handleAccept}
        disabled={submitting}
        label={submitting ? "Conectando..." : "Continuar con Google"}
      />
      {acceptError && (
        <p className="text-sm mt-3 font-medium" style={{ color: "#DC2626" }}>
          {acceptError}
        </p>
      )}
    </Card>
  );
}
