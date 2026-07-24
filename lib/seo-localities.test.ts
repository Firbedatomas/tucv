import { describe, it, expect } from "vitest";
import { localidadesDeZona, slugDeLocalidad } from "./seo-localities";

describe("slugDeLocalidad", () => {
  it("normaliza acentos y espacios", () => {
    expect(slugDeLocalidad("Córdoba")).toBe("cordoba");
    expect(slugDeLocalidad("Villa Allende")).toBe("villa-allende");
    expect(slugDeLocalidad("  Río Cuarto  ")).toBe("rio-cuarto");
  });

  it("no deja guiones colgando", () => {
    expect(slugDeLocalidad("¡Córdoba!")).toBe("cordoba");
  });
});

describe("localidadesDeZona", () => {
  // Caso real de producción (2026-07-24).
  it("saca la calle y el país, deja localidad y provincia", () => {
    expect(localidadesDeZona("El Dorado 68, Villa Allende, Córdoba, Argentina")).toEqual([
      "Villa Allende",
      "Córdoba",
    ]);
  });

  // El caso que motivó todo esto: el primer componente era el nombre del
  // comercio, y city="Bonafide Villa Allende" habría generado una página
  // titulada "Trabajo en Bonafide Villa Allende".
  it("descarta el nombre del comercio cuando viene primero", () => {
    const r = localidadesDeZona("Bonafide Villa Allende, El Dorado, Villa Allende, Córdoba, Argentina");
    expect(r).not.toContain("Bonafide Villa Allende");
    expect(r).toContain("Villa Allende");
    expect(r).toContain("Córdoba");
  });

  // Conservador: sin comas no hay forma de separar ruido de localidad.
  it("descarta zonas sin comas", () => {
    expect(localidadesDeZona("GBA Sur")).toEqual([]);
    expect(localidadesDeZona("Córdoba")).toEqual([]);
  });

  it("descarta vacío", () => {
    expect(localidadesDeZona("")).toEqual([]);
  });

  it("descarta componentes que son solo números o muy cortos", () => {
    expect(localidadesDeZona("Calle 1, 5000, Córdoba, Argentina")).toEqual(["Córdoba"]);
  });

  it("deduplica cuando la localidad se repite", () => {
    const r = localidadesDeZona("Local, Villa Allende, Villa Allende, Argentina");
    expect(r).toEqual(["Villa Allende"]);
  });

  it("saca el país escrito de cualquier forma", () => {
    expect(localidadesDeZona("Calle 1, Rosario, Santa Fe, ARGENTINA")).toEqual(["Rosario", "Santa Fe"]);
  });

  it("tolera espacios y comas de más", () => {
    expect(localidadesDeZona("Calle 1,,  Villa Allende ,  Córdoba , Argentina")).toEqual([
      "Villa Allende",
      "Córdoba",
    ]);
  });

  it("va de lo más específico a lo más general", () => {
    const r = localidadesDeZona("Av. Colón 100, Nueva Córdoba, Córdoba, Argentina");
    expect(r[0]).toBe("Nueva Córdoba");
    expect(r[r.length - 1]).toBe("Córdoba");
  });
});
