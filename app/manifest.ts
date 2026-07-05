import type { MetadataRoute } from "next";

// Web app manifest -> Next agrega <link rel="manifest"> solo y sirve
// /manifest.webmanifest. Da el ícono e identidad cuando alguien "agrega a
// pantalla de inicio" / instala la PWA (Android + navegadores de escritorio).
// Los íconos son full-bleed (fondo naranja de marca), aptos como maskable.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TuCV",
    short_name: "TuCV",
    description: "Perfil laboral simple para trabajos de cercanía.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF3E3",
    theme_color: "#FF4405",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
