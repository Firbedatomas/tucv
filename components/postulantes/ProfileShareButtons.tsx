"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/track";
import type { ShareChannel, ShareEntityType } from "@/lib/attribution";

// Misma estructura que components/public-job/ShareButtons.tsx, adaptada a
// perfil de postulante -- Plausible (trackEvent) en vez de /api/job-share:
// acá no hay un contador propio por perfil que mostrar en ningún panel
// todavía, así que no vale la pena un segundo mecanismo de conteo.
//
// Atribución (opcional, backward-compatible): si vienen `entityType`/`entityId`
// creamos un share_link antes de compartir y compartimos la URL corta (/s/...)
// en vez de la cruda, para saber qué canal trajo la vista/conversión. Si no
// vienen, se comporta como siempre (el caller viejo no cambia).
export function ProfileShareButtons({
  url,
  text,
  onShare,
  entityType,
  entityId,
}: {
  url: string;
  text: string;
  onShare?: (channel: string) => void;
  entityType?: ShareEntityType;
  entityId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [supportsFileShare, setSupportsFileShare] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupportsFileShare(typeof navigator.share === "function" && typeof navigator.canShare === "function");
  }, []);

  // Crea el share_link y devuelve la URL corta, o null si no hay atribución
  // configurada o falló la red -- nunca debe bloquear el compartir.
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
      // Sin red / error -> caemos al link crudo, no rompemos el share.
    }
    return url;
  }

  async function shareWhatsapp() {
    trackEvent("Postulante: perfil compartido", { channel: "whatsapp", source: "perfil" });
    onShare?.("whatsapp");
    const shareUrl = await resolveShareUrl("whatsapp");
    const shareTextValue = shareUrl === url ? text : text.split(url).join(shareUrl);
    window.open(`https://wa.me/?text=${encodeURIComponent(shareTextValue)}`, "_blank");
  }

  async function shareX() {
    trackEvent("Postulante: perfil compartido", { channel: "x", source: "perfil" });
    onShare?.("x");
    const shareUrl = await resolveShareUrl("x");
    const shareTextValue = shareUrl === url ? text : text.split(url).join(shareUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTextValue)}&url=${encodeURIComponent(shareUrl)}`,
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
      .catch(() => {});
  }

  async function shareInstagram() {
    trackEvent("Postulante: perfil compartido", { channel: "instagram", source: "perfil" });
    onShare?.("instagram");

    const shareUrl = await resolveShareUrl("instagram");
    const shareTextValue = shareUrl === url ? text : text.split(url).join(shareUrl);

    if (supportsFileShare) {
      try {
        // La imagen se sirve desde la URL cruda del perfil (/p/.../share-image),
        // no desde el link corto de atribución.
        const res = await fetch(`${url}/share-image`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], "perfil-tucv.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: shareTextValue, text: shareTextValue, url: shareUrl });
            return;
          }
        }
      } catch {
        // cancelado o falló el adjunto -- cae al link copiado de siempre.
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
          download="perfil-tucv.png"
          className="text-xs font-semibold underline hover:opacity-70 transition"
          style={{ color: "var(--tucv-muted)" }}
        >
          Descargar imagen
        </a>
      )}
    </div>
  );
}
