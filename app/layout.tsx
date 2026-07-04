import type { Metadata } from "next";
import "./globals.css";
import { getTheme, themeStyleVars } from "@/lib/theme/tokens";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const theme = getTheme("impacto");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
// Analytics con Plausible (opcional, deshabilitado si no hay dominio seteado
// para no ensuciar las métricas con builds locales/de test).
const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "";
const PLAUSIBLE_SRC = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "";
const plausibleEnabled = PLAUSIBLE_DOMAIN.length > 0 && PLAUSIBLE_SRC.length > 0;
const SITE_TITLE = "TuCV — cubrí puestos rápido con candidatos reales de cercanía";
const SITE_DESCRIPTION =
  "Cubrí puestos rápido con candidatos reales de cercanía, sin CVs sueltos por mail. Postulantes: creá tu perfil una vez y postulate con un clic. Negocios: publicá una búsqueda, compartí un QR y recibí postulantes ordenados.";

// Tokens de verificación de Google Search Console / Bing Webmaster Tools --
// cada uno se genera desde la cuenta del dueño del sitio en esas consolas
// (Search Console: agregar propiedad "tucv.ar" → método "etiqueta HTML" →
// copiar el content="..." acá. Bing Webmaster Tools: igual, o directamente
// "importar desde Google Search Console" una vez verificado ahí). Sin la
// env var seteada, Next.js no agrega el meta tag -- no rompe nada mientras
// no estén cargados.
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;
const BING_SITE_VERIFICATION = process.env.BING_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: { default: SITE_TITLE, template: "%s — TuCV" },
  description: SITE_DESCRIPTION,
  keywords: [
    "trabajo cerca",
    "búsqueda de personal",
    "empleo comercio",
    "CV digital",
    "buscar empleo Argentina",
    "publicar búsqueda laboral",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: BASE_URL,
    siteName: "TuCV",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  verification: {
    ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}),
    ...(BING_SITE_VERIFICATION ? { other: { "msvalidate.01": BING_SITE_VERIFICATION } } : {}),
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TuCV",
  url: BASE_URL,
  description: SITE_DESCRIPTION,
  areaServed: "AR",
  logo: `${BASE_URL}/icon.svg`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col"
        style={{
          ...themeStyleVars(theme),
          backgroundColor: "var(--tucv-bg)",
          color: "var(--tucv-text)",
          fontFamily: "var(--tucv-font)",
        }}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <Navbar />
        {children}
        <Footer />
        {plausibleEnabled && (
          <>
            <script defer data-domain={PLAUSIBLE_DOMAIN} src={PLAUSIBLE_SRC} />
            {/* Shim que pide la variante del script con tagged-events/revenue/
                pageview-props -- sin esto, un plausible(...) llamado antes de
                que cargue el script (async/defer) se pierde en vez de
                encolarse. */}
            <script
              dangerouslySetInnerHTML={{
                __html:
                  "window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }",
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}
