"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Mate en línea plana, bordes marcados -- mismo lenguaje gráfico que el
// resto de "Impacto" (nada de sombras suaves ni degradés fotorrealistas).
function MateIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M12 30c0-12 9-20 20-20s20 8 20 20-9 22-20 22-20-10-20-22Z"
        fill="var(--tucv-accent)"
        stroke="var(--tucv-border)"
        strokeWidth="3"
      />
      <ellipse cx="32" cy="11" rx="11" ry="4" fill="var(--tucv-surface)" stroke="var(--tucv-border)" strokeWidth="3" />
      <line x1="40" y1="12" x2="58" y2="2" stroke="var(--tucv-border)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function HeroVisual() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // Arranca en null (no en un número inventado) -- si el fetch todavía no
  // volvió, mejor no mostrar nada que mostrar un "24" que no es de nadie.
  const [visibleCandidates, setVisibleCandidates] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`${BASE_URL}/postulante/nuevo`, {
      width: 240,
      margin: 1,
      color: { dark: "#151515", light: "#00000000" },
    }).then((data) => {
      if (!cancelled) setQrDataUrl(data);
    });
    fetch("/api/hero-stats")
      .then((r) => r.json())
      .then((data: { visibleCandidates: number }) => {
        if (!cancelled) setVisibleCandidates(data.visibleCandidates);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full max-w-[280px] sm:max-w-[300px] lg:max-w-[280px] mx-auto lg:mx-0 lg:ml-auto">
      <div
        // isolate: sin esto, los z-30/z-20/z-10 de las tarjetitas de acá
        // adentro compiten en el stacking context RAÍZ contra el navbar
        // (sticky, z-10) y su dropdown -- al hacer scroll, esas tarjetas
        // decorativas terminaban tapando el navbar en vez de quedar detrás.
        // `isolate` encierra su propio stacking context: siguen ordenándose
        // igual ENTRE ELLAS, pero nunca por encima de nada de afuera.
        className="relative isolate p-4 sm:p-5 overflow-visible aspect-square"
        style={{ backgroundColor: "var(--tucv-bg)" }}
      >
        <MateIcon className="absolute bottom-1 right-1 w-10 -rotate-6 z-0" />

        {/* Cartel de vidriera -- el QR es lo más importante del mockup (es
            la acción real: escanear y postularse), así que va primero en
            el DOM y con el z-index más alto: nada le puede tapar el QR. */}
        <div
          className="absolute left-0 top-0 w-[58%] p-4 -rotate-2 z-30"
          style={{
            backgroundColor: "var(--tucv-primary)",
            border: "3px solid var(--tucv-border)",
            borderRadius: "var(--tucv-radius)",
            boxShadow: "5px 5px 0 var(--tucv-border)",
          }}
        >
          <p className="font-extrabold leading-tight text-lg sm:text-xl" style={{ color: "var(--tucv-primary-text)" }}>
            SE BUSCA PERSONAL
          </p>
          <p className="text-xs sm:text-sm mt-1 mb-3" style={{ color: "var(--tucv-primary-text)", opacity: 0.85 }}>
            Escaneá y dejá tu perfil
          </p>
          <div
            className="p-2 flex items-center justify-center"
            style={{ backgroundColor: "var(--tucv-surface)", border: "2px solid var(--tucv-border)" }}
          >
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data: URI generado localmente
              <img src={qrDataUrl} alt="QR para crear tu perfil en TuCV" className="w-full h-auto" />
            ) : (
              <div className="w-full aspect-square" />
            )}
          </div>
          <p
            className="text-center font-bold text-xs mt-2 tracking-wide"
            style={{ color: "var(--tucv-primary-text)" }}
          >
            TuCV
          </p>
        </div>

        {/* Mockup de celular con el perfil */}
        <div
          className="absolute right-0 top-[2%] w-[44%] p-2 rotate-2 z-20"
          style={{
            backgroundColor: "var(--tucv-text)",
            border: "3px solid var(--tucv-border)",
            borderRadius: "var(--tucv-radius)",
            boxShadow: "5px 5px 0 var(--tucv-border)",
          }}
        >
          <div
            className="p-2.5 overflow-hidden"
            style={{ backgroundColor: "var(--tucv-surface)", borderRadius: "calc(var(--tucv-radius) / 2)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-8 h-8 shrink-0 rounded-full"
                style={{ backgroundColor: "var(--tucv-accent)", border: "2px solid var(--tucv-border)" }}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-bold truncate" style={{ color: "var(--tucv-text)" }}>
                  TuCV de Sofía
                </p>
                <p className="text-[9px] truncate" style={{ color: "var(--tucv-muted)" }}>
                  Atención al público
                </p>
              </div>
            </div>
            <div className="space-y-1 mb-1.5">
              <p className="text-[9px]" style={{ color: "var(--tucv-muted)" }}>Zona Centro</p>
              <p className="text-[9px]" style={{ color: "var(--tucv-muted)" }}>Tarde / noche</p>
            </div>
            <div
              className="text-[8px] font-bold text-center py-1.5"
              style={{
                backgroundColor: "var(--tucv-accent)",
                color: "var(--tucv-text)",
                border: "1.5px solid var(--tucv-border)",
                borderRadius: "var(--tucv-radius)",
              }}
            >
              ✓ Postulación recibida
            </div>
          </div>
        </div>

        {/* Mini panel del negocio -- corrido a la derecha y abajo (antes
            tapaba el QR de arriba, que es lo importante del mockup), sin
            filas de ejemplo para que quede lo bastante bajo como para no
            pisar el celular de arriba. El número es real (/api/hero-stats),
            no inventado. */}
        <div
          className="absolute right-0 bottom-0 w-[46%] p-3 rotate-1 z-10 text-center"
          style={{
            backgroundColor: "var(--tucv-surface)",
            border: "3px solid var(--tucv-border)",
            borderRadius: "var(--tucv-radius)",
            boxShadow: "5px 5px 0 var(--tucv-border)",
          }}
        >
          <p className="font-extrabold text-xl sm:text-2xl" style={{ color: "var(--tucv-primary)" }}>
            {visibleCandidates ?? "—"}
          </p>
          <p className="text-[9px] sm:text-[10px] font-semibold" style={{ color: "var(--tucv-muted)" }}>
            postulantes cerca tuyo
          </p>
        </div>
      </div>

      <p className="text-center text-xs font-semibold mt-2" style={{ color: "var(--tucv-bg)", opacity: 0.7 }}>
        — tu vidriera, digital —
      </p>
    </div>
  );
}
