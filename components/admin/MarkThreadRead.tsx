"use client";

import { useEffect } from "react";

// Componente cliente separado a propósito: si esto corriera como efecto de
// server-render de la página del hilo, el prefetch de <Link> (Next.js
// precarga rutas que entran en el viewport de la lista) marcaría todo como
// leído solo por aparecer en pantalla, sin que el admin lo haya abierto de
// verdad. Un efecto de cliente sí distingue "prefetcheado" de "realmente
// montado en el navegador".
export function MarkThreadRead({ threadId }: { threadId: string }) {
  useEffect(() => {
    fetch(`/api/admin/email/threads/${threadId}/read`, { method: "POST" }).catch(() => {});
  }, [threadId]);
  return null;
}
