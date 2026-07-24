import { describe, it, expect } from "vitest";
import { esCadenaConocida, normalizarNombre } from "./chain-detection";

describe("normalizarNombre", () => {
  it("saca acentos, puntuación y mayúsculas", () => {
    expect(normalizarNombre("Café Martínez")).toBe("cafe martinez");
    expect(normalizarNombre("McDonald's")).toBe("mcdonald s");
    expect(normalizarNombre("  Doble   espacio  ")).toBe("doble espacio");
  });
});

describe("esCadenaConocida", () => {
  // Los casos reales que aparecieron con candidatos interesados (2026-07-24).
  it.each([
    "YPF",
    "Coto",
    "Topper",
    "Kevingston",
    "47 STREET La Plata",
    "Supermayorista Vital",
    "Juan Valdez Café",
    "Gimnasio Smart Fit - Barrio Norte",
    "Tienda de Café",
  ])("detecta %s", (nombre) => {
    expect(esCadenaConocida(nombre)).toBe(true);
  });

  it("detecta sucursales con el nombre de la marca adentro", () => {
    expect(esCadenaConocida("Bonafide Villa Allende")).toBe(true);
    expect(esCadenaConocida("Farmacity Nueva Córdoba")).toBe(true);
  });

  // Lo importante: NO barrer con el cliente objetivo.
  it.each([
    "Panadería La Esperanza",
    "Kiosco Don Pedro",
    "Almacén de Ramos Generales",
    "Peluquería Vanesa",
    "Ferretería El Tornillo",
    "Distribuidora Don Loukas",
    "La Fonte",
    "Verdulería del Barrio",
  ])("no marca a %s como cadena", (nombre) => {
    expect(esCadenaConocida(nombre)).toBe(false);
  });

  // El motivo de comparar por palabra completa y no por substring: "dia" es
  // una cadena de supermercados, pero también un pedazo de muchas palabras.
  it("no confunde una marca corta con parte de otra palabra", () => {
    expect(esCadenaConocida("Diagonal Norte")).toBe(false);
    expect(esCadenaConocida("Café Mediodía")).toBe(false);
    expect(esCadenaConocida("Radial Repuestos")).toBe(false);
    expect(esCadenaConocida("Día")).toBe(true);
  });

  it("una marca de varias palabras necesita la secuencia completa", () => {
    expect(esCadenaConocida("Smart Fit")).toBe(true);
    // "Smart" solo no alcanza: podría ser cualquier negocio.
    expect(esCadenaConocida("Smart Soluciones Informáticas")).toBe(false);
  });

  it("no rompe con entradas vacías o raras", () => {
    expect(esCadenaConocida("")).toBe(false);
    expect(esCadenaConocida("   ")).toBe(false);
    expect(esCadenaConocida("!!!")).toBe(false);
  });
});
