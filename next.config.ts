import type { NextConfig } from "next";

// Headers de seguridad para TODAS las rutas. CSP deliberadamente acotado a las
// directivas de alto valor y BAJO riesgo de romper el producto (frame-ancestors,
// object-src, base-uri, form-action): no restringimos script-src/style-src
// porque la app usa Google OAuth/Places, Mercado Pago y Plausible con scripts
// externos e inline de Next, y un allowlist mal puesto ahí rompería el flujo
// real. Clickjacking queda cubierto por frame-ancestors 'self' + X-Frame-Options.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https:",
  },
];

const nextConfig: NextConfig = {
  // Salida "standalone": genera un server.js autocontenido para Docker/Hetzner.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
