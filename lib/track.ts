type PlausibleProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: PlausibleProps }) => void;
  }
}

// Wrapper del shim de app/layout.tsx -- si Plausible está deshabilitado (sin
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN/SRC seteadas) `window.plausible` ni siquiera
// existe, así que cualquier `plausible(...)` suelto en un componente
// rompería en dev/local. Este wrapper hace que instrumentar un evento en
// cualquier lado sea siempre seguro.
export function trackEvent(name: string, props?: PlausibleProps): void {
  if (typeof window === "undefined" || typeof window.plausible !== "function") return;
  window.plausible(name, props ? { props } : undefined);
}
