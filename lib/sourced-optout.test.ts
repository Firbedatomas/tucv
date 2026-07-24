import { describe, it, expect } from "vitest";
import { generarTokenBaja, verificarTokenBaja } from "./sourced-optout";

const CLAVE = "clave-de-prueba-no-usada-en-produccion";

describe("token de baja de empresas detectadas", () => {
  it("ida y vuelta: el token devuelve el id del negocio", () => {
    const t = generarTokenBaja("abc123def456ghi", CLAVE);
    expect(verificarTokenBaja(t, CLAVE)).toBe("abc123def456ghi");
  });

  // Lo importante: con el token propio no se puede dar de baja a otro.
  it("no se puede cambiar el id sin invalidar la firma", () => {
    const t = generarTokenBaja("negocio-uno", CLAVE);
    const manipulado = t.replace("negocio-uno", "negocio-dos");
    expect(verificarTokenBaja(manipulado, CLAVE)).toBeNull();
  });

  it("rechaza una firma inventada", () => {
    expect(verificarTokenBaja("negocio-uno.firmafalsa", CLAVE)).toBeNull();
  });

  it("rechaza un token de otra clave", () => {
    const t = generarTokenBaja("negocio-uno", "otra-clave");
    expect(verificarTokenBaja(t, CLAVE)).toBeNull();
  });

  it.each(["", "sinpunto", ".soloelpunto", "  "])("rechaza basura: %s", (t) => {
    expect(verificarTokenBaja(t, CLAVE)).toBeNull();
  });

  // Sin secreto configurado no se emiten ni se aceptan tokens: preferimos que
  // el mail no salga antes que mandar uno con una baja que no funciona.
  it("sin clave no genera ni verifica", () => {
    expect(generarTokenBaja("negocio-uno", "")).toBe("");
    expect(verificarTokenBaja("negocio-uno.x", "")).toBeNull();
  });

  it("dos negocios distintos dan tokens distintos", () => {
    expect(generarTokenBaja("uno", CLAVE)).not.toBe(generarTokenBaja("dos", CLAVE));
  });
});
