import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cookies — TuCV",
  description: "Qué datos guarda TuCV en tu navegador y para qué los usa.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies" updated="julio de 2026">
      <p>
        TuCV <strong>no usa cookies de publicidad ni de seguimiento entre sitios</strong>. No
        vendemos ni compartimos datos de navegación con terceros.
      </p>
      <p>
        Lo único que guardamos en tu navegador es un dato técnico de sesión (en{" "}
        <code>localStorage</code>, no en una cookie) para que no tengas que volver a iniciar
        sesión con Google cada vez que entrás. Ese dato:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Solo lo lee tu navegador y nuestro servidor.</li>
        <li>Se borra automáticamente al cerrar sesión.</li>
        <li>No se usa para mostrarte publicidad ni para rastrearte en otros sitios.</li>
      </ul>
      <p style={{ color: "var(--tucv-muted)" }}>
        Si en el futuro sumamos herramientas de analítica o medición, vamos a actualizar esta
        página antes de activarlas.
      </p>
    </LegalPage>
  );
}
