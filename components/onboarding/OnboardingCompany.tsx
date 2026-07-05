"use client";

import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/Button";
import { QRCodeView } from "@/components/qr/QRCodeView";
import { ShareButtons } from "@/components/public-job/ShareButtons";
import { generateJobFlyerDataUrl } from "@/lib/job-flyer";
import { businessSlugFor } from "@/lib/slug";

// Pantalla de "próximos pasos" que aparece apenas se publica la búsqueda --
// junta a la vista todo lo que la hace mover (compartir, cartel QR para la
// vidriera, invitar candidatos visibles, completar los datos que atraen más
// postulantes) en vez de dejarlo escondido detrás del link público. Reusa
// los mismos componentes reales que ApplicantsPanel: ShareButtons (con su
// tracking de /api/job-share) y QRCodeView + generateJobFlyerDataUrl.
//
// Además de slug/shortCode necesita jobId (lo pide ShareButtons para contar
// los compartidos) y role/businessName/businessLogoUrl (los usa el cartel
// imprimible) -- sin esos datos el cartel saldría genérico, sin el puesto ni
// el negocio, que es justo lo que lo hace servible para pegar en el local.
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
        style={{ backgroundColor: "var(--tucv-text)", color: "var(--tucv-bg)" }}
        aria-hidden
      >
        {n}
      </span>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="font-bold mb-1.5">{title}</p>
        {children}
      </div>
    </li>
  );
}

export function OnboardingCompany({
  slug,
  shortCode,
  jobId,
  role,
  businessName,
  businessLogoUrl,
}: {
  slug: string;
  shortCode: string;
  jobId: string;
  role: string;
  businessName: string;
  businessLogoUrl?: string | null;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tucv.ar";
  // Misma construcción que ApplicantsPanel: formato nuevo negocio/código
  // cuando hay short_code (el segmento del negocio es cosmético, la búsqueda
  // real es por código), con el slug de un segmento como red de seguridad.
  const publicUrl = shortCode
    ? `${origin}/b/${businessSlugFor(businessName)}/${shortCode}`
    : `${origin}/b/${slug}`;
  const shareTitle = `Estamos buscando ${role || "personal"}. Postulate en TuCV:`;

  return (
    <div
      className="mt-4 rounded-[var(--tucv-radius)] p-5 sm:p-6"
      style={{
        backgroundColor: "var(--tucv-accent)",
        border: "2px solid var(--tucv-border)",
        boxShadow: "var(--tucv-shadow)",
      }}
    >
      <h2 className="text-lg font-bold mb-1">Tu búsqueda ya está publicada</h2>
      <p className="text-sm font-semibold mb-5" style={{ color: "var(--tucv-text)" }}>
        Para que llegue a más gente:
      </p>

      <ul className="space-y-5">
        <Step n={1} title="Compartila por WhatsApp">
          <ShareButtons jobId={jobId} url={publicUrl} title={shareTitle} />
        </Step>

        <Step n={2} title="Descargá el cartel QR">
          <p className="text-sm mb-3" style={{ color: "var(--tucv-text)" }}>
            Ya viene con el puesto y tu negocio — listo para imprimir.
          </p>
          <QRCodeView
            url={publicUrl}
            fileName={slug}
            flyerButtonLabel="Descargar cartel para imprimir"
            renderFlyer={(qrDataUrl) =>
              generateJobFlyerDataUrl({ role, businessName, qrDataUrl, logoUrl: businessLogoUrl })
            }
          />
        </Step>

        <Step n={3} title="Pegalo en la vidriera">
          <p className="text-sm" style={{ color: "var(--tucv-text)" }}>
            Quien pase por el local escanea el QR con la cámara y su postulación te llega al toque.
          </p>
        </Step>

        <Step n={4} title="Invitá candidatos visibles">
          <p className="text-sm mb-2" style={{ color: "var(--tucv-text)" }}>
            Hay gente de tu zona ya lista para laburar — invitala a postularse sin esperar.
          </p>
          <LinkButton href="/empresa/candidatos" variant="secondary">
            Ver candidatos de mi zona
          </LinkButton>
        </Step>

        <Step n={5} title="Completá sueldo, turno y zona">
          <p className="text-sm mb-2" style={{ color: "var(--tucv-text)" }}>
            Las búsquedas con esos datos reciben más postulaciones y de gente que sí encaja.
          </p>
          <LinkButton href={`/empresa/busquedas/${jobId}/editar`} variant="secondary">
            Completar los datos
          </LinkButton>
        </Step>
      </ul>
    </div>
  );
}
