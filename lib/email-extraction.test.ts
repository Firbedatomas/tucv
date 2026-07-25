import { describe, it, expect } from "vitest";
import { extraerEmail, esEmailUtil } from "./email-extraction";

describe("esEmailUtil", () => {
  it("acepta emails normales", () => {
    expect(esEmailUtil("contacto@panaderia.com.ar")).toBe(true);
  });

  it.each([
    "noreply@panaderia.com.ar",
    "no-reply@panaderia.com.ar",
    "postmaster@panaderia.com.ar",
    "algo@sentry.io",
    "test@example.com",
    "logo.png",
    "sin-arroba",
    "",
  ])("rechaza %s", (e) => {
    expect(esEmailUtil(e)).toBe(false);
  });

  it("rechaza emails de plataformas de sitios", () => {
    expect(esEmailUtil("soporte@wix.com")).toBe(false);
    expect(esEmailUtil("x@tiendanube.com")).toBe(false);
  });
});

describe("extraerEmail", () => {
  it("saca el email de un mailto", () => {
    const html = '<a href="mailto:contacto@panaderia.com.ar">Escribinos</a>';
    expect(extraerEmail(html, "panaderia.com.ar")).toBe("contacto@panaderia.com.ar");
  });

  it("saca un email suelto del texto", () => {
    expect(extraerEmail("<p>Consultas: hola@kiosco.com.ar</p>", "kiosco.com.ar")).toBe("hola@kiosco.com.ar");
  });

  it("prefiere el prefijo de contacto sobre uno personal", () => {
    const html = "juan.perez@panaderia.com.ar y tambien contacto@panaderia.com.ar";
    expect(extraerEmail(html, "panaderia.com.ar")).toBe("contacto@panaderia.com.ar");
  });

  // El caso típico: el pie de página trae el mail del estudio que hizo el sitio.
  it("descarta emails de otro dominio cuando se conoce el propio", () => {
    const html = "contacto@panaderia.com.ar — sitio por hola@agenciaweb.com";
    expect(extraerEmail(html, "panaderia.com.ar")).toBe("contacto@panaderia.com.ar");
  });

  // Medio comercio de barrio usa gmail y lo publica en su propio sitio.
  it("acepta casillas gratuitas aunque no sean del dominio", () => {
    const html = '<a href="mailto:panaderialaesperanza@gmail.com">mail</a>';
    expect(extraerEmail(html, "panaderia.com.ar")).toBe("panaderialaesperanza@gmail.com");
  });

  // Casos reales de una muestra de producción (2026-07-25): el mail del
  // proveedor de Shopify y el de la cadena hotelera se colaban como si fueran
  // del negocio.
  it("descarta el mail del proveedor que hizo el sitio", () => {
    expect(extraerEmail('<a href="mailto:support@starapps.studio">x</a>', "patagonia.com.ar")).toBeNull();
    expect(extraerEmail("reservas@sofitel.com", "almabuenosaires.com")).toBeNull();
  });

  it("descarta placeholders de plantilla", () => {
    expect(extraerEmail("contacto@ejemplo.com", "ropahindu.com.ar")).toBeNull();
    expect(extraerEmail("info@tuempresa.com", "negocio.com.ar")).toBeNull();
  });

  it("normaliza a minúsculas", () => {
    expect(extraerEmail("CONTACTO@Panaderia.COM.AR", "panaderia.com.ar")).toBe("contacto@panaderia.com.ar");
  });

  it("ignora los descartables aunque sean los únicos", () => {
    expect(extraerEmail('<a href="mailto:noreply@panaderia.com.ar">x</a>', "panaderia.com.ar")).toBeNull();
  });

  it("devuelve null si no hay nada", () => {
    expect(extraerEmail("<html><body>Sin contacto</body></html>")).toBeNull();
    expect(extraerEmail("")).toBeNull();
  });

  it("no se confunde con archivos que parecen email", () => {
    expect(extraerEmail("<img src='logo@2x.png'>")).toBeNull();
  });

  it("funciona sin dominio conocido", () => {
    expect(extraerEmail("info@negocio.com.ar")).toBe("info@negocio.com.ar");
  });

  it("deduplica", () => {
    const html = "info@x.com.ar info@x.com.ar info@x.com.ar";
    expect(extraerEmail(html, "x.com.ar")).toBe("info@x.com.ar");
  });
});
