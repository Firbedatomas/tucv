"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { stashGoogleProfile } from "@/lib/google-profile-stash";
import { resolveBusinessAccess } from "@/lib/business-access";
import { safeNextPath } from "@/lib/safe-next-path";
import { trySetAdminSession } from "@/lib/admin-login-check";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Card } from "@/components/ui/Card";

export function LoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      const client = pb();
      const authData = await client.collection("users").authWithOAuth2({ provider: "google" });
      const googleName = authData?.meta?.name as string | undefined;
      if (googleName) stashGoogleProfile({ name: googleName });

      // Si es el admin, entra directo al panel de admin desde cualquier login.
      if (await trySetAdminSession(client.authStore.token)) {
        window.location.href = "/admin";
        return;
      }

      const userId = client.authStore.record?.id;
      const access = userId ? await resolveBusinessAccess(client, userId) : null;
      // `next` = a dónde volver tras loguear (ej. el formulario de crear
      // búsqueda que la empresa empezó sin cuenta). safeNextPath solo deja
      // pasar paths internos seguros (bloquea //evil.com, javascript:, etc.);
      // "" = no había un next válido. Si ya tiene negocio, va directo a `next`;
      // si no, pasa por registro llevándose el `next` para volver al final.
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"), "");
      if (access) {
        router.push(next || "/empresa/panel");
      } else {
        router.push(next ? `/empresa/registro?next=${encodeURIComponent(next)}` : "/empresa/registro");
      }
    } catch {
      setError("No pudimos iniciar sesión con Google. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <GoogleButton
        onClick={handleGoogleLogin}
        disabled={submitting}
        label={submitting ? "Conectando..." : "Ingresar con Google"}
      />
      {error && (
        <p className="text-sm mt-3 font-medium" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
    </Card>
  );
}
