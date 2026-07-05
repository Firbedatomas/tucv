"use client";

import type { ReactNode } from "react";
import { LinkButton } from "@/components/ui/Button";
import { QRCodeView } from "@/components/qr/QRCodeView";
import { ProfileShareButtons } from "@/components/postulantes/ProfileShareButtons";
import { emitActivity } from "@/lib/emit-activity";
import { trackEvent } from "@/lib/track";

// Pantalla de "próximos pasos" que aparece apenas se crea/actualiza el
// perfil -- todas las funciones que hacen que un perfil se mueva (compartir,
// pedir que otros compartan, QR, referencias, disponibilidad) juntas y a la
// vista, en vez de escondidas detrás del link público. Reusa los mismos
// componentes reales que ya usa app/p/[slug]/page.tsx (ProfileShareButtons,
// QRCodeView) -- no duplica lógica de compartir.
//
// Solo necesita el slug: el QR va sin plantilla imprimible acá (el paso es
// "Descargá tu QR", el cartel completo con nombre/rubro/zona vive en el
// perfil público /p/{slug}, donde sí tenemos esos datos).
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

export function OnboardingCandidate({ slug }: { slug: string }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://tucv.ar";
  const profileUrl = `${origin}/p/${slug}`;

  // Mensajes en primera persona: es la persona pidiéndole a su círculo que
  // reenvíe SU perfil (mismo espíritu que los "helpPresets" de
  // app/p/[slug]/page.tsx, pero desde el dueño del perfil, no un visitante).
  const askPresets = [
    {
      label: "A un amigo",
      msg: `Che, armé mi perfil para conseguir laburo. ¿Me tirás una mano y lo pasás a quien pueda estar buscando gente? ${profileUrl}`,
    },
    {
      label: "A la familia",
      msg: `Hola, hice mi perfil en TuCV para conseguir trabajo. ¿Lo compartís por si alguien necesita? ${profileUrl}`,
    },
    {
      label: "Al grupo del barrio",
      msg: `Buenas, estoy buscando trabajo y armé mi perfil. Si alguien sabe de algo, este es mi perfil: ${profileUrl}`,
    },
  ];

  return (
    <div
      className="mt-4 rounded-[var(--tucv-radius)] p-5 sm:p-6"
      style={{
        backgroundColor: "var(--tucv-accent)",
        border: "2px solid var(--tucv-border)",
        boxShadow: "var(--tucv-shadow)",
      }}
    >
      <h2 className="text-lg font-bold mb-1">Tu perfil ya está listo</h2>
      <p className="text-sm font-semibold mb-5" style={{ color: "var(--tucv-text)" }}>
        Para conseguir más movimiento:
      </p>

      <ul className="space-y-5">
        <Step n={1} title="Compartilo por WhatsApp">
          <ProfileShareButtons
            url={profileUrl}
            text={`Estoy buscando laburo. Mirá mi perfil en TuCV: ${profileUrl}`}
            onShare={() => trackEvent("Postulante: compartido desde onboarding")}
          />
        </Step>

        <Step n={2} title="Pedí a 3 personas que lo compartan">
          <p className="text-sm mb-2" style={{ color: "var(--tucv-text)" }}>
            Cada reenvío te acerca a alguien que está buscando gente.
          </p>
          <div className="flex flex-wrap gap-2">
            {askPresets.map((p) => (
              <a
                key={p.label}
                href={`https://wa.me/?text=${encodeURIComponent(p.msg)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  trackEvent("Postulante: pedido de compartir", { preset: p.label, source: "onboarding" });
                  emitActivity("help_request_shared", {});
                }}
                className="text-xs font-semibold px-3 py-1.5 rounded-[var(--tucv-radius)]"
                style={{ backgroundColor: "var(--tucv-text)", color: "var(--tucv-bg)" }}
              >
                {p.label}
              </a>
            ))}
          </div>
        </Step>

        <Step n={3} title="Descargá tu QR">
          <p className="text-sm mb-3" style={{ color: "var(--tucv-text)" }}>
            Pegalo donde te conozcan — el kiosco, el club, la parada. Quien lo escanee ve tu perfil.
          </p>
          <QRCodeView
            url={profileUrl}
            fileName={slug}
            onDownloadQr={() => emitActivity("profile_qr_downloaded", {})}
          />
        </Step>

        <Step n={4} title="Sumá una referencia">
          <p className="text-sm mb-2" style={{ color: "var(--tucv-text)" }}>
            Un ex jefe o compañero que responda por vos hace que te elijan antes.
          </p>
          <LinkButton href={`/p/${slug}`} variant="secondary">
            Pedir una referencia
          </LinkButton>
        </Step>

        <Step n={5} title="Revisá tu disponibilidad">
          <p className="text-sm mb-2" style={{ color: "var(--tucv-text)" }}>
            Cuantos más turnos aceptes, en más búsquedas aparecés.
          </p>
          <LinkButton href="/postulante/editar" variant="secondary">
            Revisar mi disponibilidad
          </LinkButton>
        </Step>
      </ul>
    </div>
  );
}
