"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/track";

// Dispara scroll_50 / scroll_90 UNA sola vez por carga de página (no por
// rerender): usamos un Set local al efecto y listener pasivo. Montar una sola
// vez por página (ej. en la home). No renderiza nada.
export function ScrollDepthTracker() {
  useEffect(() => {
    const fired = new Set<string>();
    const thresholds: [number, string][] = [
      [0.5, "scroll_50"],
      [0.9, "scroll_90"],
    ];
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const ratio = (window.scrollY || doc.scrollTop) / scrollable;
      for (const [pct, name] of thresholds) {
        if (ratio >= pct && !fired.has(name)) {
          fired.add(name);
          trackEvent(name);
        }
      }
      if (fired.size === thresholds.length) window.removeEventListener("scroll", onScroll);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return null;
}
