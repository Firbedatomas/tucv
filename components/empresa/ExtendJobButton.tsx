"use client";

import { useState } from "react";
import { pb } from "@/lib/pocketbase";
import { Button } from "@/components/ui/Button";

// Solo tiene sentido en el plan gratis (7 días fijos) -- Pro/Equipo
// no tienen ese tope, así que el llamador de este componente ya filtra
// cuándo mostrarlo (no repetimos ese chequeo acá).
export function ExtendJobButton({ jobPostId, expiresAt }: { jobPostId: string; expiresAt: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mismo motivo que BoostJobButton: Date.now() no puede llamarse directo
  // en el cuerpo del componente (regla de pureza de React).
  const [mountedAt] = useState(() => Date.now());

  async function handleExtend() {
    setLoading(true);
    setError(null);
    try {
      const token = pb().authStore.token;
      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, type: "job_extend", jobPostId }),
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

  const expired = new Date(expiresAt).getTime() < mountedAt;

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="secondary" onClick={handleExtend} disabled={loading}>
        {loading ? "Redirigiendo a Mercado Pago..." : expired ? "Extender esta búsqueda +15 días" : "Sumar 15 días más"}
      </Button>
      {error && (
        <p className="text-xs font-medium" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
