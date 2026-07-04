"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";
import type { BusinessRecord } from "@/lib/use-business-auth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatThousands } from "@/lib/format";

const PLAN_LABEL: Record<BusinessRecord["plan"], string> = {
  free: "Gratis",
  pro: "Pro",
  multi_local: "Equipo",
};

const PRO_FEATURES = [
  "Búsquedas activas ilimitadas al mismo tiempo",
  "Cada búsqueda nueva arranca destacada 7 días, sin pagar boost aparte",
];

const MULTI_LOCAL_FEATURES = [
  "Hasta 10 búsquedas activas al mismo tiempo",
  "Cada búsqueda nueva arranca destacada, sin pagar boost aparte",
  "Invitá hasta 10 miembros de tu equipo a revisar búsquedas y postulantes",
  "Soporte prioritario",
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="text-sm space-y-1.5 mb-4">
      {items.map((f) => (
        <li key={f} className="flex gap-2">
          <span style={{ color: "var(--tucv-primary)" }}>✓</span>
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlanUpgradeCard({ business }: { business: BusinessRecord }) {
  const [loadingType, setLoadingType] = useState<"pro" | "multi_local" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Los precios viven en variables de entorno del servidor (para poder
  // cambiarlos sin tocar código) -- este componente es cliente, así que los
  // pide a un endpoint en vez de leerlos directo. null mientras carga: mejor
  // no mostrar un precio que mostrar uno viejo/inventado un instante.
  const [prices, setPrices] = useState<{ pro: number; multiLocal: number } | null>(null);

  useEffect(() => {
    fetch("/api/plan-prices")
      .then((r) => r.json())
      .then((data: { pro: number; multiLocal: number }) => setPrices(data))
      .catch(() => {});
  }, []);

  async function handleUpgrade(type: "pro" | "multi_local") {
    setLoadingType(type);
    setError(null);
    try {
      const token = pb().authStore.token;
      const res = await fetch("/api/mercadopago/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, type: type === "pro" ? "plan_pro" : "multi_local" }),
      });
      const data = await res.json();
      if (!res.ok || !data.init_point) {
        throw new Error(data.error || "No pudimos iniciar el pago.");
      }
      window.location.href = data.init_point;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar el pago. Probá de nuevo.");
      setLoadingType(null);
    }
  }

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h2 className="font-bold">Tu plan</h2>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-[var(--tucv-radius)]"
          style={
            business.plan !== "free"
              ? { backgroundColor: "var(--tucv-accent)", color: "var(--tucv-text)", border: "1.5px solid var(--tucv-border)" }
              : { backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)", border: "1.5px solid var(--tucv-border)" }
          }
        >
          {PLAN_LABEL[business.plan]}
        </span>
      </div>

      {business.plan !== "free" ? (
        <FeatureList items={business.plan === "multi_local" ? MULTI_LOCAL_FEATURES : PRO_FEATURES} />
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: "var(--tucv-muted)" }}>
            Con el plan Gratis podés crear 1 búsqueda por mes, y esa búsqueda dura 7 días. Si
            necesitás más, esto es lo que suma cada plan pago:
          </p>

          <div className="mb-4 p-3 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-bg)" }}>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="font-bold text-sm">Pro</p>
              {prices && (
                <p className="text-sm font-bold" style={{ color: "var(--tucv-primary)" }}>
                  {formatThousands(String(prices.pro))} / mes
                </p>
              )}
            </div>
            <FeatureList items={PRO_FEATURES} />
            <Button type="button" onClick={() => handleUpgrade("pro")} disabled={loadingType !== null}>
              {loadingType === "pro" ? "Redirigiendo..." : "Actualizar a Pro"}
            </Button>
          </div>

          <div className="mb-4 p-3 rounded-[var(--tucv-radius)]" style={{ backgroundColor: "var(--tucv-bg)" }}>
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="font-bold text-sm">Equipo</p>
              {prices && (
                <p className="text-sm font-bold" style={{ color: "var(--tucv-primary)" }}>
                  {formatThousands(String(prices.multiLocal))} / mes
                </p>
              )}
            </div>
            <FeatureList items={MULTI_LOCAL_FEATURES} />
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleUpgrade("multi_local")}
              disabled={loadingType !== null}
            >
              {loadingType === "multi_local" ? "Redirigiendo..." : "Actualizar a Plan Equipo"}
            </Button>
          </div>

          {error && (
            <p className="text-sm font-medium mb-3" style={{ color: "#DC2626" }}>
              {error}
            </p>
          )}
        </>
      )}

      <Link href="/precios" className="text-sm font-semibold underline" style={{ color: "var(--tucv-primary)" }}>
        Ver precios y comparar todos los planes
      </Link>
    </Card>
  );
}
