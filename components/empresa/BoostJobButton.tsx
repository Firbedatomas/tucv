"use client";

import { useState } from "react";
import { pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/Button";

export function BoostJobButton({ jobPostId, featuredUntil }: { jobPostId: string; featuredUntil?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Capturado una sola vez al montar (no en cada render) -- evaluar
  // Date.now() directo en el cuerpo del componente rompe la regla de
  // pureza de React (el resultado puede cambiar entre renders sin que
  // ninguna prop/state lo pida).
  const [mountedAt] = useState(() => Date.now());

  const isFeatured = Boolean(featuredUntil) && new Date(featuredUntil as string).getTime() > mountedAt;

  async function handleBoost() {
    setLoading(true);
    setError(null);
    try {
      const token = pb().authStore.token;
      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, type: "job_boost", jobPostId }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        throw new Error(data.error || "No pudimos iniciar el pago.");
      }
      window.location.href = data.init_point;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar el pago. Probá de nuevo.");
      setLoading(false);
    }
  }

  if (isFeatured) {
    return (
      <span className="text-sm font-semibold" style={{ color: "var(--tucv-accent)" }}>
        Destacada hasta el {new Date(featuredUntil as string).toLocaleDateString("es-AR")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={handleBoost} disabled={loading}>
        {loading ? "Redirigiendo a Mercado Pago..." : "Destacar esta búsqueda"}
      </Button>
      {error && (
        <p className="text-xs font-medium" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
