"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { stashGoogleProfile } from "@/lib/google-profile-stash";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Card } from "@/components/ui/Card";

export function LoginForm({ next }: { next?: string }) {
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
      const googleAvatar = authData?.meta?.avatarURL as string | undefined;
      if (googleName || googleAvatar) {
        stashGoogleProfile({ name: googleName, avatarUrl: googleAvatar });
      }

      if (next) {
        router.push(next);
        return;
      }

      const userId = client.authStore.record?.id;
      // Si ya tiene perfil, lo mandamos a VERLO (como lo ve cualquiera) en
      // vez de directo al formulario de edición -- entrar y encontrarse de
      // entrada con un formulario para completar, cuando el perfil ya está
      // listo, se sentía como "esto no guardó" aunque sí. Editar sigue a un
      // clic desde ahí (o desde el navbar).
      const profileSlug = userId
        ? await client
            .collection("candidate_profiles")
            .getFirstListItem(`user="${userId}"`, { requestKey: null })
            .then((record) => (record.profile_slug as string) || null)
            .catch(() => undefined)
        : undefined;

      if (profileSlug) {
        router.push(`/p/${profileSlug}`);
      } else if (profileSlug === null) {
        // Tiene perfil pero sin slug (dato viejo) -- no hay a dónde
        // "verlo", vamos directo a editar como red de seguridad.
        router.push("/postulante/editar");
      } else {
        router.push("/postulante/nuevo");
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
