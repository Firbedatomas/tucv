import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@tucv.ar";

export const metadata: Metadata = {
  title: "Contacto — TuCV",
  description: "Escribinos si tenés dudas, un problema con tu cuenta o una sugerencia para TuCV.",
  alternates: { canonical: "/contacto" },
};

export default function ContactoPage() {
  return (
    <LegalPage title="Contacto">
      <p>
        ¿Tenés dudas, un problema con tu perfil o tu cuenta de negocio, o alguna sugerencia?
        Escribinos y te respondemos a la brevedad.
      </p>
      <p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="font-bold text-lg"
          style={{ color: "var(--tucv-primary)" }}
        >
          {CONTACT_EMAIL}
        </a>
      </p>
      <p style={{ color: "var(--tucv-muted)" }}>
        Si tu consulta es sobre una búsqueda o postulación puntual, incluí el link público (
        <code>tucv.ar/b/...</code> o <code>tucv.ar/p/...</code>) para que podamos ubicarla más
        rápido.
      </p>
    </LegalPage>
  );
}
