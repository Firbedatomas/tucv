"use client";

import { useEffect, useState } from "react";
import {
  type MemberKind,
  MEMBER_ROLE_LABEL,
  formatJoinedDate,
  formatMemberNumber,
  isFounder,
} from "@/lib/member-card";

// Cuenta ascendente hasta el número de miembro. Es la animación que hace que el
// número se sienta ganado en vez de simplemente aparecer; termina siempre en el
// valor exacto (nunca en un redondeo del easing).
function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Con "menos movimiento" el conteo dura un frame: el número aparece
    // directo en su valor final, sin quitarlo de la tarjeta.
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : durationMs;
    let raf = 0;
    const start = performance.now();
    function frame(now: number) {
      const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      // easeOutCubic: arranca rápido y frena, como un contador mecánico.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(t === 1 ? target : Math.max(1, Math.round(target * eased)));
      if (t < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

/**
 * Versión en HTML (y animada) de la misma tarjeta que sale en el PNG que se
 * descarga -- ver lib/member-share-card.tsx. Las dos leen los mismos textos de
 * lib/member-card.ts para que lo que se ve y lo que se comparte digan igual.
 */
export function MemberCard({
  kind,
  number,
  joinedAt,
}: {
  kind: MemberKind;
  number: number;
  joinedAt: string;
}) {
  const shown = useCountUp(number);
  const founder = isFounder(number);
  const date = formatJoinedDate(joinedAt);
  const joinedLine = kind === "candidate" ? `Me sumé el ${date}` : `Nos sumamos el ${date}`;

  return (
    <div
      className="tucv-card-in w-full max-w-[380px] px-6 py-8 text-center"
      style={{
        backgroundColor: "var(--tucv-surface)",
        border: "3px solid var(--tucv-border)",
        boxShadow: "10px 10px 0 var(--tucv-border)",
      }}
    >
      <p
        className="text-xs sm:text-sm font-bold tracking-[0.28em]"
        style={{ color: "var(--tucv-muted)" }}
      >
        {MEMBER_ROLE_LABEL[kind].toUpperCase()} N.º
      </p>

      <p
        className="font-extrabold leading-none mt-2 tabular-nums"
        style={{ fontSize: "clamp(3.75rem, 22vw, 6.5rem)", color: "var(--tucv-text)" }}
      >
        {formatMemberNumber(shown)}
      </p>

      {founder && (
        <p
          className="tucv-seal-in inline-block mt-5 px-4 py-2 text-sm font-extrabold tracking-[0.12em]"
          style={{
            backgroundColor: "var(--tucv-primary)",
            color: "var(--tucv-primary-text)",
            border: "3px solid var(--tucv-border)",
          }}
        >
          MIEMBRO FUNDADOR
        </p>
      )}

      <div
        className="mx-auto mt-7 h-[3px] w-40"
        style={{ backgroundColor: "var(--tucv-border)" }}
        aria-hidden
      />

      <p className="mt-5 text-base font-bold" style={{ color: "var(--tucv-text)" }}>
        {joinedLine}
      </p>

      <p className="mt-6 text-lg font-extrabold" style={{ color: "var(--tucv-text)" }}>
        tucv.ar
      </p>
      <p className="text-xs font-bold" style={{ color: "var(--tucv-muted)" }}>
        Trabajo cerca tuyo
      </p>
    </div>
  );
}
