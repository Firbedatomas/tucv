"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/track";
import type { ShareChannel, ShareEntityType } from "@/lib/attribution";

function registerShare(jobId: string, platform: "whatsapp" | "x" | "instagram") {
  trackEvent("Empresa: busqueda compartida", { channel: platform });
  // Fire-and-forget: nunca debe bloquear ni romper la acción de compartir
  // en sí por un error de red acá.
  fetch("/api/job-share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId, platform }),
  }).catch(() => {});
}

// Atribución (opcional, backward-compatible): con `entityType`/`entityId`
// creamos un share_link y compartimos la URL corta (/s/...) en vez de la cruda,
// para saber qué canal trajo la vista/postulación. Sin esas props, comparte el
// link crudo como siempre (el caller viejo no cambia).
export function ShareButtons({
  jobId,
  url,
  title,
  entityType,
  entityId,
}: {
  jobId: string;
  url: string;
  title: string;
  entityType?: ShareEntityType;
  entityId?: string;
}) {
  const [copied, setCopied] = useState(false);
  // Detección de soporte real de Web Share con archivos (sobre todo Chrome
  // Android/iOS Safari recientes) -- en desktop casi nunca está, ahí
  // mostramos el link de descarga en vez del botón nativo. Se calcula en
  // cliente (useEffect) porque `navigator` no existe en el render de
  // servidor.
  const [supportsFileShare, setSupportsFileShare] = useState(false);
  useEffect(() => {
    // Detección real de una API del navegador (no estado derivable de props/
    // otro state) -- no hay forma de calcular esto durante el render sin
    // arriesgar un mismatch de hidratación (navigator no existe en SSR), la
    // regla de "no setState directo en efecto" no aplica bien a este caso.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupportsFileShare(typeof navigator.share === "function" && typeof navigator.canShare === "function");
  }, []);

  // Crea el share_link y devuelve la URL corta, o la cruda si no hay atribución
  // configurada o falló la red -- nunca bloquea el compartir.
  async function resolveShareUrl(channel: ShareChannel): Promise<string> {
    if (!entityType || !entityId) return url;
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, channel }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.url === "string") return data.url;
      }
    } catch {
      // Sin red / error -> caemos al link crudo.
    }
    return url;
  }

  async function shareWhatsapp() {
    registerShare(jobId, "whatsapp");
    const shareUrl = await resolveShareUrl("whatsapp");
    window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${shareUrl}`)}`, "_blank");
  }

  async function shareX() {
    registerShare(jobId, "x");
    const shareUrl = await resolveShareUrl("x");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
      "_blank",
    );
  }

  function copyLinkFallback(shareUrl: string) {
    navigator.clipboard
      ?.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Sin permiso de portapapeles (bloqueado por el navegador, ej. sin
        // gesto de usuario reciente) -- el share ya quedó registrado, no es
        // motivo para romper la página.
      });
  }

  // Instagram no tiene link de "compartir" público como WhatsApp/X, ni lee
  // og:image para posts nuevos -- la única forma real de mandarle una
  // imagen ya armada es la Web Share API con un archivo adjunto, que abre
  // la hoja de compartir nativa del celular (ahí el usuario elige feed o
  // historia con la imagen puesta). Sin ese soporte (desktop, navegadores
  // viejos) cae al link copiado de siempre -- ahí el link de descarga de
  // abajo cubre el caso de querer subir la imagen a mano.
  async function shareInstagram() {
    registerShare(jobId, "instagram");

    const shareUrl = await resolveShareUrl("instagram");

    if (supportsFileShare) {
      try {
        // La imagen se sirve desde la URL cruda de la búsqueda (/b/.../share-image),
        // no desde el link corto de atribución.
        const res = await fetch(`${url}/share-image`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], "busqueda-tucv.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title, text: title, url: shareUrl });
            return;
          }
        }
      } catch {
        // Cancelado por el usuario (AbortError) o falló el fetch/adjunto --
        // seguimos con el fallback de copiar el link, no vale la pena
        // romper la página por esto.
      }
    }

    copyLinkFallback(shareUrl);
  }

  const buttonClass = "text-xs font-semibold px-2.5 py-1.5 rounded-[var(--tucv-radius)] hover:opacity-70 transition";
  const buttonStyle = { border: "2px solid var(--tucv-border)", color: "var(--tucv-text)" };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold" style={{ color: "var(--tucv-muted)" }}>
        Compartir:
      </span>
      <button type="button" onClick={shareWhatsapp} className={buttonClass} style={buttonStyle}>
        WhatsApp
      </button>
      <button type="button" onClick={shareX} className={buttonClass} style={buttonStyle}>
        X
      </button>
      <button type="button" onClick={shareInstagram} className={buttonClass} style={buttonStyle}>
        {copied ? "¡Copiado!" : "Instagram"}
      </button>
      {!supportsFileShare && (
        <a
          href={`${url}/share-image`}
          download="busqueda-tucv.png"
          className="text-xs font-semibold underline hover:opacity-70 transition"
          style={{ color: "var(--tucv-muted)" }}
        >
          Descargar imagen
        </a>
      )}
    </div>
  );
}
