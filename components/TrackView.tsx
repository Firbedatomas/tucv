"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/track";

// Dispara un evento Plausible al montar (vista de página). Para instrumentar
// embudos desde server components, que no pueden llamar trackEvent directo.
export function TrackView({ event, props }: { event: string; props?: Record<string, string> }) {
  useEffect(() => {
    trackEvent(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
