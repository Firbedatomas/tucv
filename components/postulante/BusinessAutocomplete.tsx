"use client";

import { useEffect, useRef, useState } from "react";
import { inputClass, inputStyle } from "@/components/ui/Field";

type BusinessMatch = { id: string; business_name: string; city_zone: string };

export function BusinessAutocomplete({
  value,
  companyId,
  onChange,
}: {
  value: string;
  companyId: string;
  onChange: (value: string, companyId: string) => void;
}) {
  const [matches, setMatches] = useState<BusinessMatch[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2 || companyId) return;
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search-businesses?q=${encodeURIComponent(value.trim())}`)
        .then((res) => res.json())
        .then((data) => setMatches(data.items || []))
        .catch(() => setMatches([]));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, companyId]);

  return (
    <div className="relative">
      <input
        className={`${inputClass} text-sm py-2`}
        style={inputStyle}
        value={value}
        onChange={(e) => {
          onChange(e.target.value, "");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Empresa"
      />
      {companyId && (
        <span
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold"
          style={{ color: "#128C4A" }}
          title="Empresa verificada en TuCV"
        >
          ✓
        </span>
      )}
      {open && !companyId && matches.length > 0 && (
        <div
          className="absolute z-10 left-0 right-0 mt-1 rounded-[var(--tucv-radius)] overflow-hidden"
          style={{ backgroundColor: "var(--tucv-surface)", boxShadow: "var(--tucv-shadow)", border: "1px solid var(--tucv-border)" }}
        >
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              onMouseDown={() => {
                onChange(m.business_name, m.id);
                setMatches([]);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:opacity-80"
              style={{ borderTop: "1px solid var(--tucv-border)" }}
            >
              <span className="font-semibold">{m.business_name}</span>{" "}
              <span style={{ color: "var(--tucv-muted)" }}>· {m.city_zone}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
