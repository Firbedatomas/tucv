import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "server-only": path.resolve(__dirname, "lib/email/test-server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    // Los patrones tienen que ser `**/` y no solo la raíz: los worktrees de
    // .claude/ traen su propio node_modules, y sin esto vitest levantaba los
    // tests de dependencias (svix, @stablelib, ...) y la suite daba 48
    // archivos en rojo por tests que no son nuestros.
    exclude: ["**/node_modules/**", "**/.next/**", ".claude/worktrees/**"],
  },
});
