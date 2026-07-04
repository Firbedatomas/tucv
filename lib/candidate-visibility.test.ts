import { describe, it, expect } from "vitest";
import { publicDisplayName, canRevealWhatsApp, stripSensitive, NEVER_PUBLIC_FIELDS } from "./candidate-visibility";

describe("publicDisplayName", () => {
  it("nombre de pila + inicial del apellido, nunca el apellido completo", () => {
    expect(publicDisplayName("Juan Pérez García")).toBe("Juan P.");
    expect(publicDisplayName("Nicole Correa")).toBe("Nicole C.");
    expect(publicDisplayName("Madonna")).toBe("Madonna");
    expect(publicDisplayName("")).toBe("Alguien");
  });
});

describe("canRevealWhatsApp", () => {
  it("nunca a un visitante público", () => {
    expect(canRevealWhatsApp({ viewerIsCompany: false, consentContact: true })).toBe(false);
    expect(canRevealWhatsApp({ viewerIsCompany: false, consentContact: false, hasAcceptedContactRequest: true })).toBe(false);
  });
  it("a una empresa solo con consentimiento o contacto aceptado", () => {
    expect(canRevealWhatsApp({ viewerIsCompany: true, consentContact: true })).toBe(true);
    expect(canRevealWhatsApp({ viewerIsCompany: true, consentContact: false })).toBe(false);
    expect(canRevealWhatsApp({ viewerIsCompany: true, consentContact: false, hasAcceptedContactRequest: true })).toBe(true);
  });
});

describe("stripSensitive", () => {
  it("elimina todos los campos nunca-públicos", () => {
    const raw = { id: "1", name: "Juan", whatsapp: "123", birth_date: "2000", cv_file: "x.pdf", city_zone: "Córdoba" };
    const safe = stripSensitive(raw);
    expect(safe.id).toBe("1");
    expect(safe.city_zone).toBe("Córdoba");
    for (const f of NEVER_PUBLIC_FIELDS) expect(f in safe).toBe(false);
  });
});
