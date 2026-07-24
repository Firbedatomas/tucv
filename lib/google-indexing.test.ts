import { describe, it, expect } from "vitest";
import { esUrlDeBusqueda } from "./google-indexing";

const BASE = "https://tucv.ar";

// Esta guarda protege el acceso mismo a la Indexing API: Google la restringe
// por política a JobPosting, y mandar otra cosa puede costar el privilegio.
// Por eso se testea de más, no de menos.
describe("esUrlDeBusqueda", () => {
  it("acepta el formato nuevo /b/<negocio>/<codigo>", () => {
    expect(esUrlDeBusqueda("https://tucv.ar/b/bonafide/oz3p1g", BASE)).toBe(true);
  });

  it("acepta el formato legado /b/<slug>", () => {
    expect(esUrlDeBusqueda("https://tucv.ar/b/cocinero-bonafide-x7f2a", BASE)).toBe(true);
  });

  it.each([
    ["la home", "https://tucv.ar/"],
    ["precios", "https://tucv.ar/precios"],
    ["un perfil de postulante", "https://tucv.ar/p/juan-perez"],
    ["login de empresa", "https://tucv.ar/empresa/login"],
    ["el listado de oportunidades", "https://tucv.ar/oportunidades"],
    ["una ruta que solo empieza parecido", "https://tucv.ar/blog/algo"],
  ])("rechaza %s (no lleva JobPosting)", (_caso, url) => {
    expect(esUrlDeBusqueda(url, BASE)).toBe(false);
  });

  it("rechaza /b/ sin nada después", () => {
    expect(esUrlDeBusqueda("https://tucv.ar/b/", BASE)).toBe(false);
    expect(esUrlDeBusqueda("https://tucv.ar/b", BASE)).toBe(false);
  });

  it("rechaza más segmentos de los que puede tener una búsqueda", () => {
    expect(esUrlDeBusqueda("https://tucv.ar/b/negocio/codigo/extra", BASE)).toBe(false);
  });

  it("rechaza otro host", () => {
    expect(esUrlDeBusqueda("https://otrositio.com/b/bonafide/oz3p1g", BASE)).toBe(false);
  });

  it("rechaza www (el apex es el canónico, www redirige)", () => {
    expect(esUrlDeBusqueda("https://www.tucv.ar/b/bonafide/oz3p1g", BASE)).toBe(false);
  });

  it("rechaza http (Google indexa la versión https)", () => {
    expect(esUrlDeBusqueda("http://tucv.ar/b/bonafide/oz3p1g", BASE)).toBe(false);
  });

  it("rechaza rutas relativas: exige URL absoluta", () => {
    expect(esUrlDeBusqueda("/b/bonafide/oz3p1g", BASE)).toBe(false);
  });

  it.each(["", "no es una url", "javascript:alert(1)"])("rechaza basura: %s", (url) => {
    expect(esUrlDeBusqueda(url, BASE)).toBe(false);
  });

  it("tolera barra final", () => {
    expect(esUrlDeBusqueda("https://tucv.ar/b/bonafide/oz3p1g/", BASE)).toBe(true);
  });
});
