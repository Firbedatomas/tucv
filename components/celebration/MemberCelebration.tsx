"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Confetti } from "@/components/celebration/Confetti";
import { MemberCard } from "@/components/celebration/MemberCard";
import { buttonBaseClass, buttonVariantStyle } from "@/components/ui/Button";
import { trackEvent } from "@/lib/track";
import {
  type MemberKind,
  type MemberNumber,
  formatMemberNumber,
  memberShareFileName,
  memberShareText,
} from "@/lib/member-card";

type Channel = "x" | "whatsapp" | "instagram" | "descarga";

/**
 * La fiesta del alta: confeti desde los dos costados y, en el medio, la tarjeta
 * con el número de miembro que le tocó a esta persona/negocio. La misma tarjeta
 * se puede bajar como PNG (1080x1350) y compartir en X, WhatsApp o Instagram.
 *
 * Si el número no se puede resolver (red caída, PocketBase, etc.) el diálogo no
 * aparece y llama a `onClose` -- el alta ya está hecha, la celebración nunca
 * puede quedar trabando el flujo.
 */
export function MemberCelebration({
  kind,
  id,
  onClose,
}: {
  kind: MemberKind;
  id: string;
  onClose: () => void;
}) {
  const [member, setMember] = useState<MemberNumber | null>(null);
  const [supportsFileShare, setSupportsFileShare] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [confettiRound, setConfettiRound] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // `onClose` puede ser una función nueva en cada render del padre; guardarla en
  // un ref evita re-disparar el fetch o los listeners por eso.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const imageUrl = `/api/miembro/share-image?kind=${kind}&id=${encodeURIComponent(id)}`;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/miembro?kind=${kind}&id=${encodeURIComponent(id)}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("sin numero"))))
      .then((data: MemberNumber) => {
        if (cancelled) return;
        setMember(data);
        trackEvent("Fiesta: tarjeta de miembro", { kind, numero: data.number });
      })
      .catch(() => {
        if (!cancelled) onCloseRef.current();
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id]);

  useEffect(() => {
    // Detección real de una API del navegador -- mismo caso que
    // components/public-job/ShareButtons.tsx: `navigator` no existe en SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupportsFileShare(typeof navigator.share === "function" && typeof navigator.canShare === "function");
  }, []);

  const close = useCallback(() => onCloseRef.current(), []);

  // Mientras la fiesta está en pantalla, la página de atrás no scrollea: el
  // diálogo tapa todo y en celular es fácil terminar moviendo el fondo.
  useEffect(() => {
    if (!member) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [member]);

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!member) return null;

  const shareText = memberShareText(kind, member.number);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tucv.ar";
  const fileName = memberShareFileName(kind, member.number);
  const totalLabel = kind === "candidate" ? "postulantes registrados" : "empresas registradas";

  function track(channel: Channel) {
    trackEvent("Fiesta: tarjeta compartida", { kind, channel });
  }

  function shareX() {
    track("x");
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(origin)}`,
      "_blank",
      "noopener",
    );
  }

  function shareWhatsapp() {
    track("whatsapp");
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${origin}`)}`, "_blank", "noopener");
  }

  function downloadImage() {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // Instagram no acepta un link de "compartir" como WhatsApp o X, y tampoco lee
  // og:image para un posteo nuevo: la única forma de mandarle la tarjeta ya
  // armada es adjuntar el archivo con la Web Share API, que abre la hoja nativa
  // del celular (ahí se elige feed o historia). Sin ese soporte -- escritorio,
  // navegadores viejos -- se descarga el PNG y se sube a mano.
  async function shareInstagram() {
    track("instagram");
    if (supportsFileShare) {
      try {
        const res = await fetch(imageUrl);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], text: shareText });
            return;
          }
        }
      } catch {
        // Cancelado por la persona (AbortError) o falló el fetch/adjunto: cae al
        // camino de descargar la imagen, no vale la pena romper la fiesta.
      }
    }
    downloadImage();
    setNote("Te descargamos la tarjeta: subila a tu historia de Instagram.");
  }

  const shareButtonClass = `${buttonBaseClass} flex-1 min-w-[104px] px-3 py-2.5`;

  return (
    <>
      <Confetti trigger={confettiRound} />
      <div
        className="fixed inset-0 flex justify-center overflow-y-auto p-4 tucv-fade-in"
        // z-index inline (y no una clase arbitraria) para dejar explícito que
        // tiene que quedar por encima del header `sticky z-10` del Navbar y por
        // debajo del confeti, que va en 70.
        style={{ zIndex: 60, backgroundColor: "rgba(21, 21, 21, 0.72)" }}
        onClick={(ev) => {
          if (ev.target === ev.currentTarget) close();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tucv-fiesta-titulo"
          tabIndex={-1}
          className="w-full max-w-md my-auto p-5 sm:p-7 outline-none"
          style={{
            backgroundColor: "var(--tucv-bg)",
            border: "3px solid var(--tucv-border)",
            boxShadow: "8px 8px 0 var(--tucv-border)",
          }}
        >
          <h2 id="tucv-fiesta-titulo" className="text-2xl font-extrabold text-center">
            {kind === "candidate" ? "¡Ya sos parte de TuCV!" : "¡Ya son parte de TuCV!"}
          </h2>
          <p className="text-sm text-center mt-1 font-semibold" style={{ color: "var(--tucv-muted)" }}>
            {formatMemberNumber(member.total)} {totalLabel} y contando.
          </p>

          <div className="flex justify-center mt-6">
            <MemberCard kind={kind} number={member.number} joinedAt={member.joinedAt} />
          </div>

          <div className="mt-7">
            <button
              type="button"
              onClick={() => {
                track("descarga");
                downloadImage();
              }}
              className={`${buttonBaseClass} w-full`}
              style={buttonVariantStyle.primary}
            >
              Descargar mi tarjeta
            </button>

            <p className="text-xs font-semibold mt-5 mb-2" style={{ color: "var(--tucv-muted)" }}>
              Mostrala en:
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={shareX} className={shareButtonClass} style={buttonVariantStyle.secondary}>
                X
              </button>
              <button
                type="button"
                onClick={shareWhatsapp}
                className={shareButtonClass}
                style={buttonVariantStyle.secondary}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={shareInstagram}
                className={shareButtonClass}
                style={buttonVariantStyle.secondary}
              >
                Instagram
              </button>
            </div>

            {note && (
              <p className="text-xs font-semibold mt-3" style={{ color: "var(--tucv-text)" }}>
                {note}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfettiRound((n) => n + 1)}
                className="text-sm font-semibold underline underline-offset-4 hover:opacity-70 transition"
                style={{ color: "var(--tucv-muted)" }}
              >
                Más confeti
              </button>
              <button
                type="button"
                onClick={close}
                className={buttonBaseClass}
                style={buttonVariantStyle.ghost}
              >
                Seguir →
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
