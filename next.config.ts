import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida "standalone": genera un server.js autocontenido para Docker/Hetzner.
  output: "standalone",
};

export default nextConfig;
