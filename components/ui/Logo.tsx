export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect x="6" y="8" width="52" height="52" rx="10" fill="var(--tucv-border)" />
      <rect
        x="4"
        y="4"
        width="52"
        height="52"
        rx="10"
        fill="var(--tucv-primary)"
        stroke="var(--tucv-border)"
        strokeWidth="4"
      />
      {/* Ficha/CV con un check adentro -- no un check suelto, para que el
          isotipo diga "perfil verificado", no cualquier cosa. */}
      <rect
        x="17"
        y="14"
        width="26"
        height="34"
        rx="4"
        fill="var(--tucv-surface)"
        stroke="var(--tucv-border)"
        strokeWidth="2.5"
        transform="rotate(-8 30 31)"
      />
      <path
        d="M22 32 L28 39 L42 21"
        fill="none"
        stroke="var(--tucv-border)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="rotate(-8 30 31)"
      />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="font-bold text-lg" style={{ color: "var(--tucv-text)" }}>
        TuCV
      </span>
    </span>
  );
}
