"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { pb } from "@/lib/pocketbase";
import { GoogleButton } from "@/components/ui/GoogleButton";
import { Card } from "@/components/ui/Card";

export function AdminLoginForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setSubmitting(true);
    setError(null);
    const client = pb();
    try {
      await client.collection("users").authWithOAuth2({ provider: "google" });
      const token = client.authStore.token;
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        client.authStore.clear();
        setError(
          res.status === 403
            ? "Esa cuenta de Google no tiene acceso a este panel."
            : "No pudimos verificar la sesión. Probá de nuevo."
        );
        setSubmitting(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      client.authStore.clear();
      setError("No pudimos iniciar sesión con Google. Probá de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <GoogleButton
        onClick={handleGoogleLogin}
        disabled={submitting}
        label={submitting ? "Verificando..." : "Ingresar con Google"}
      />
      {error && (
        <p className="text-sm mt-3 font-medium" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
    </Card>
  );
}
