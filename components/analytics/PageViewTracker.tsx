"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/track";

// Dispara un evento Plausible UNA sola vez por montaje (no por rerender): útil
// para "vio esta página" tipo view_radar. No renderiza nada.
export function PageViewTracker({ event }: { event: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    trackEvent(event);
  }, [event]);
  return null;
}
