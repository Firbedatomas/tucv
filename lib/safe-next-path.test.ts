import { describe, it, expect } from "vitest";
import { safeNextPath } from "./safe-next-path";

describe("safeNextPath", () => {
  it("acepta paths internos válidos", () => {
    expect(safeNextPath("/empresa/busquedas/nueva")).toBe("/empresa/busquedas/nueva");
    expect(safeNextPath("/empresa/panel?tab=activas")).toBe("/empresa/panel?tab=activas");
    expect(safeNextPath("/b/mi-negocio/abc123")).toBe("/b/mi-negocio/abc123");
  });

  it("rechaza redirects externos y protocolo-relativos", () => {
    for (const bad of [
      "https://evil.com",
      "http://evil.com",
      "//evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "/\t/evil.com",
      "https:evil.com",
    ]) {
      expect(safeNextPath(bad)).toBe("/empresa/panel");
    }
  });

  it("rechaza esquemas peligrosos", () => {
    expect(safeNextPath("javascript:alert(1)")).toBe("/empresa/panel");
    expect(safeNextPath("data:text/html,<script>")).toBe("/empresa/panel");
    expect(safeNextPath("/x:javascript")).toBe("/empresa/panel");
  });

  it("rechaza trucos encoded (//evil, backslash, control)", () => {
    expect(safeNextPath("/%2F%2Fevil.com")).toBe("/empresa/panel");
    expect(safeNextPath("%2F%2Fevil.com")).toBe("/empresa/panel");
    expect(safeNextPath("/%5Cevil.com")).toBe("/empresa/panel");
    expect(safeNextPath("/%09/evil")).toBe("/empresa/panel");
  });

  it("rechaza vacío / no-string / relativo y usa el fallback dado", () => {
    expect(safeNextPath(null)).toBe("/empresa/panel");
    expect(safeNextPath(undefined)).toBe("/empresa/panel");
    expect(safeNextPath("")).toBe("/empresa/panel");
    expect(safeNextPath("empresa/panel")).toBe("/empresa/panel"); // sin slash inicial
    expect(safeNextPath("evil.com", "")).toBe("");
    expect(safeNextPath("//evil.com", "/empresa/busquedas/nueva")).toBe("/empresa/busquedas/nueva");
  });
});
