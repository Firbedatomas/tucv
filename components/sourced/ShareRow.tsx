"use client";

import { useState } from "react";

export function ShareRow({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  return (
    <div className="flex gap-2 flex-wrap">
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-bold px-4 py-2 rounded-[var(--tucv-radius)]"
        style={{ backgroundColor: "#128C4A", color: "#fff" }}
      >
        Compartir por WhatsApp
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(url);
          setCopied(true);
        }}
        className="text-sm font-semibold px-4 py-2 rounded-[var(--tucv-radius)]"
        style={{ border: "1.5px solid var(--tucv-border)", color: "var(--tucv-text)" }}
      >
        {copied ? "Link copiado ✓" : "Copiar link"}
      </button>
    </div>
  );
}
