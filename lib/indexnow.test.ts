import { describe, it, expect } from "vitest";
import { filterOwnUrls } from "./indexnow";

const BASE = "https://tucv.ar";

describe("filterOwnUrls", () => {
  it("deja pasar URLs del propio host", () => {
    expect(filterOwnUrls(["https://tucv.ar/b/bonafide/oz3p1g"], BASE)).toEqual([
      "https://tucv.ar/b/bonafide/oz3p1g",
    ]);
  });

  it("resuelve rutas relativas contra la base", () => {
    expect(filterOwnUrls(["/precios"], BASE)).toEqual(["https://tucv.ar/precios"]);
  });

  // El motivo de existir de esta función: IndexNow rechaza el lote COMPLETO si
  // una sola URL es de otro dominio, así que una URL ajena no puede colarse.
  it("descarta URLs de otro host", () => {
    expect(filterOwnUrls(["https://ejemplo.com/x", "https://tucv.ar/ok"], BASE)).toEqual([
      "https://tucv.ar/ok",
    ]);
  });

  it("descarta subdominios (pb.tucv.ar no es tucv.ar)", () => {
    expect(filterOwnUrls(["https://pb.tucv.ar/api/files/x.jpg"], BASE)).toEqual([]);
  });

  it("descarta protocolos que no son http/https", () => {
    expect(filterOwnUrls(["javascript:alert(1)", "mailto:a@b.com"], BASE)).toEqual([]);
  });

  it("descarta strings que no parsean como URL", () => {
    expect(filterOwnUrls(["no es una url", ""], BASE)).toEqual([]);
  });

  it("deduplica", () => {
    expect(filterOwnUrls(["https://tucv.ar/a", "https://tucv.ar/a", "/a"], BASE)).toEqual([
      "https://tucv.ar/a",
    ]);
  });

  it("normaliza el hash: /a#x y /a son la misma URL para un buscador", () => {
    expect(filterOwnUrls(["https://tucv.ar/a#seccion", "https://tucv.ar/a"], BASE)).toEqual([
      "https://tucv.ar/a",
    ]);
  });

  it("conserva la query (?code=x sí cambia el contenido)", () => {
    expect(filterOwnUrls(["https://tucv.ar/b?code=x"], BASE)).toEqual(["https://tucv.ar/b?code=x"]);
  });

  it("devuelve vacío si la base es inválida", () => {
    expect(filterOwnUrls(["https://tucv.ar/a"], "no-es-una-base")).toEqual([]);
  });

  it("no rompe con lista vacía", () => {
    expect(filterOwnUrls([], BASE)).toEqual([]);
  });
});
