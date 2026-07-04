import { describe, it, expect } from "vitest";
import { coarseLocality } from "./anonymize";

describe("coarseLocality", () => {
  it("descarta el negocio/calle de una dirección de búsqueda (dropFirst)", () => {
    expect(
      coarseLocality("Bonafide Villa Allende, El Dorado, Villa Allende, Córdoba, Argentina", true),
    ).toBe("Villa Allende, Córdoba");
    // Nunca debe filtrar el nombre del negocio.
    expect(
      coarseLocality("Bonafide Villa Allende, El Dorado, Villa Allende, Córdoba, Argentina", true),
    ).not.toMatch(/Bonafide/i);
  });

  it("con dirección corta cae al último segmento seguro, sin filtrar el negocio", () => {
    expect(coarseLocality("Bonafide, Córdoba, Argentina", true)).toBe("Córdoba");
    expect(coarseLocality("Bonafide, Córdoba, Argentina", true)).not.toMatch(/Bonafide/i);
  });

  it("zonas de candidato (dropFirst=false) quedan como ciudad, provincia", () => {
    expect(coarseLocality("Pilar, Provincia de Buenos Aires, Argentina", false)).toBe(
      "Pilar, Provincia de Buenos Aires",
    );
    expect(coarseLocality("Córdoba, Argentina", false)).toBe("Córdoba");
  });

  it("tolera vacío y strings raros", () => {
    expect(coarseLocality("", true)).toBe("");
    expect(coarseLocality("Argentina", false)).toBe("");
    expect(coarseLocality("Córdoba", true)).toBe("Córdoba");
  });
});
