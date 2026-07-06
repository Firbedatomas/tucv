"use client";

import { useState } from "react";

// Muestra el logo de una empresa de forma PROLIJA y consistente: fondo blanco
// (para que los logos transparentes o de cualquier color se vean parejos),
// object-contain + padding (no se estira ni recorta), y si la imagen ROMPE
// (URL muerta, 404) cae a la inicial en vez de mostrar el ícono de imagen rota.
export function LogoImg({
  src,
  name,
  size = 40,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  // Un favicon de Instagram/Facebook es el ícono genérico de la red, NO el logo
  // del negocio -> lo tratamos como "sin logo" y mostramos la inicial (más
  // prolijo que un ícono de IG repetido en todas las empresas).
  const generic = Boolean(src) && /instagram\.com|facebook\.com|fbcdn|s2\/favicons\?domain=(?:www\.)?(?:instagram|facebook)/i.test(src || "");
  const showImg = Boolean(src) && !failed && !generic;
  const pad = size >= 56 ? 8 : 5;

  return (
    <div
      className="shrink-0 rounded-[var(--tucv-radius)] flex items-center justify-center font-bold overflow-hidden"
      style={{
        width: size,
        height: size,
        backgroundColor: showImg ? "#ffffff" : "var(--tucv-bg)",
        border: "1.5px solid var(--tucv-border)",
        color: "var(--tucv-muted)",
      }}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain", padding: pad }}
        />
      ) : (
        <span style={{ fontSize: size >= 56 ? 22 : 14 }}>{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
