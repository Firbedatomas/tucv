"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRCodeView({
  url,
  fileName,
  renderFlyer,
  flyerButtonLabel = "Descargar plantilla para imprimir",
  onDownloadQr,
  onDownloadPoster,
}: {
  url: string;
  fileName: string;
  // Opcional -- si viene, habilita el botón de plantilla imprimible
  // completa (recibe el QR ya generado como data URL y devuelve el cartel
  // entero). Genérico a propósito: lo usan tanto búsquedas
  // (lib/job-flyer.ts) como perfiles de postulante (lib/candidate-flyer.ts)
  // sin acoplar este componente a ninguno de los dos.
  renderFlyer?: (qrDataUrl: string) => Promise<string>;
  flyerButtonLabel?: string;
  // Opcionales -- callbacks de métrica que se disparan cuando el usuario
  // descarga el QR o el cartel/flyer. Los usos existentes que no los pasan
  // no se ven afectados (se invocan con `?.()`).
  onDownloadQr?: () => void;
  onDownloadPoster?: () => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [flyerUrl, setFlyerUrl] = useState<string | null>(null);
  const [generatingFlyer, setGeneratingFlyer] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { width: 480, margin: 2 }).then((data) => {
      if (!cancelled) setDataUrl(data);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  // La plantilla se genera bajo demanda (no en cada render): es más pesada
  // que el QR solo y no todos la van a querer, además el resultado no
  // cambia mientras el puesto/negocio no cambien -- se puede volver a
  // descargar las veces que quiera sin regenerarla de nuevo.
  async function handleDownloadFlyer() {
    if (!dataUrl || !renderFlyer) return;
    if (flyerUrl) {
      triggerDownload(flyerUrl);
      onDownloadPoster?.();
      return;
    }
    setGeneratingFlyer(true);
    try {
      const flyer = await renderFlyer(dataUrl);
      setFlyerUrl(flyer);
      triggerDownload(flyer);
      onDownloadPoster?.();
    } finally {
      setGeneratingFlyer(false);
    }
  }

  function triggerDownload(href: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = `${fileName}-plantilla.png`;
    a.click();
  }

  if (!dataUrl) {
    return (
      <div
        className="w-40 h-40 rounded-[var(--tucv-radius)] flex items-center justify-center text-xs"
        style={{ backgroundColor: "var(--tucv-bg)", color: "var(--tucv-muted)" }}
      >
        Generando QR...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- data: URI generado localmente, no aplica el optimizador de imágenes */}
      <img src={dataUrl} alt={`QR de ${fileName}`} className="w-40 h-40" width={160} height={160} />
      <a
        href={dataUrl}
        download={`${fileName}.png`}
        onClick={() => onDownloadQr?.()}
        className="text-sm font-semibold"
        style={{ color: "var(--tucv-primary)" }}
      >
        Descargar QR para imprimir
      </a>
      {renderFlyer && (
        <button
          type="button"
          onClick={handleDownloadFlyer}
          disabled={generatingFlyer}
          className="text-sm font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)] disabled:opacity-50"
          style={{ border: "2px solid var(--tucv-border)", color: "var(--tucv-text)" }}
        >
          {generatingFlyer ? "Generando..." : flyerButtonLabel}
        </button>
      )}
    </div>
  );
}
