"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/track";

// Misma estructura que components/public-job/ShareButtons.tsx, adaptada a
// perfil de postulante -- Plausible (trackEvent) en vez de /api/job-share:
// acá no hay un contador propio por perfil que mostrar en ningún panel
// todavía, así que no vale la pena un segundo mecanismo de conteo.
export function ProfileShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const [supportsFileShare, setSupportsFileShare] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupportsFileShare(typeof navigator.share === "function" && typeof navigator.canShare === "function");
  }, []);

  function shareWhatsapp() {
    trackEvent("Postulante: perfil compartido", { channel: "whatsapp", source: "perfil" });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareX() {
    trackEvent("Postulante: perfil compartido", { channel: "x", source: "perfil" });
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
  }

  function copyLinkFallback() {
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  async function shareInstagram() {
    trackEvent("Postulante: perfil compartido", { channel: "instagram", source: "perfil" });

    if (supportsFileShare) {
      try {
        const res = await fetch(`${url}/share-image`);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], "perfil-tucv.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: text, text, url });
            return;
          }
        }
      } catch {
        // cancelado o falló el adjunto -- cae al link copiado de siempre.
      }
    }

    copyLinkFallback();
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
