"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inputClass, inputStyle } from "@/components/ui/Field";

export type AdminSelectFilter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

// Filtros server-driven vía query params (?q=&plan=...) -- las páginas de
// admin/negocios y admin/postulantes son server components (leen
// searchParams directo, sin JS de por medio para el fetch en sí), así que
// el único trabajo de este componente es actualizar la URL; el filtrado
// posta pasa en el server. `q` se debounce (busca mientras se tipea), los
// selects cambian la URL al toque.
export function AdminFilters({
  basePath,
  searchPlaceholder,
  selects = [],
}: {
  basePath: string;
  searchPlaceholder: string;
  selects?: AdminSelectFilter[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    params.delete("page"); // cualquier cambio de filtro vuelve a la página 1
    router.push(`${basePath}?${params.toString()}`);
  }

  useEffect(() => {
    const id = setTimeout(() => {
      if (q !== (searchParams.get("q") ?? "")) pushParams({ q });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        className={inputClass}
        style={{ ...inputStyle, maxWidth: "20rem" }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={searchPlaceholder}
      />
      {selects.map((s) => (
        <select
          key={s.key}
          className={inputClass}
          style={{ ...inputStyle, maxWidth: "14rem" }}
          value={searchParams.get(s.key) ?? ""}
          onChange={(e) => pushParams({ [s.key]: e.target.value })}
        >
          <option value="">{s.label}</option>
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
    </div>
  );
}
