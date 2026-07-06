"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pb } from "@/lib/pocketbase";

type Data = { total: number; candidates: { id: string; name: string; slug: string; cityZone: string }[] };

// Si el negocio llegó reclamando una empresa detectada, mostramos los candidatos
// que ya habían marcado interés en sus búsquedas -> cumple el gancho del outreach
// ("reclamá para ver los interesados"). Si no reclamó nada, no renderiza nada.
export function DetectedInterestBanner() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const client = pb();
    if (!client.authStore.isValid) return;
    fetch("/api/empresa/detected-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: client.authStore.token }),
    })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data || data.total === 0) return null;

  return (
    <div
      className="rounded-[var(--tucv-radius)] p-4 mb-5"
      style={{ backgroundColor: "var(--tucv-accent)", border: "2px solid var(--tucv-border)" }}
    >
      <p className="font-bold mb-1">
        {data.total} persona{data.total !== 1 ? "s" : ""} ya mostr{data.total !== 1 ? "aron" : "ó"} interés en tus
        búsquedas
      </p>
      <p className="text-sm mb-3" style={{ color: "var(--tucv-text)" }}>
        Marcaron interés cuando detectamos tu empresa. Completá y publicá tus búsquedas para conectar con ellos.
      </p>
      {data.candidates.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {data.candidates.slice(0, 8).map((c) =>
            c.slug ? (
              <Link
                key={c.id}
                href={`/p/${c.slug}`}
                className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                style={{ backgroundColor: "var(--tucv-surface)", border: "1.5px solid var(--tucv-border)", color: "var(--tucv-text)" }}
              >
                {c.name.split(/\s+/)[0]}
                {c.cityZone ? ` · ${c.cityZone.split(",")[0]}` : ""}
              </Link>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}
