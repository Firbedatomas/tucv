import { describe, it, expect } from "vitest";
import { parsearElementos, consultaOverpass, ZONAS_OSM, type ElementoOsm } from "./osm-capture";

const el = (tags: Record<string, string>, id = 1): ElementoOsm => ({ id, type: "node", tags });

describe("parsearElementos", () => {
  it("saca los datos de un comercio típico", () => {
    const r = parsearElementos([
      el({ name: "Panadería La Esperanza", shop: "bakery", "contact:email": "Info@Pan.com.ar", phone: "+54 351 123-4567" }),
    ]);
    expect(r[0]).toMatchObject({
      nombre: "Panadería La Esperanza",
      rubro: "Gastronomía",
      email: "info@pan.com.ar",
      telefono: "+543511234567",
    });
  });

  // El mismo dato viene en dos claves distintas según quién lo cargó. Es donde
  // se pierden datos en silencio si no se normaliza.
  it("acepta email tanto en `email` como en `contact:email`", () => {
    expect(parsearElementos([el({ name: "A", shop: "kiosk", email: "a@x.com" })])[0].email).toBe("a@x.com");
    expect(parsearElementos([el({ name: "B", shop: "kiosk", "contact:email": "b@x.com" })])[0].email).toBe("b@x.com");
  });

  it("prefiere la clave sin prefijo cuando están las dos", () => {
    const r = parsearElementos([el({ name: "C", shop: "kiosk", email: "directo@x.com", "contact:email": "otro@x.com" })]);
    expect(r[0].email).toBe("directo@x.com");
  });

  it("descarta elementos sin nombre", () => {
    expect(parsearElementos([el({ shop: "bakery" })])).toEqual([]);
  });

  it("descarta elementos sin tags", () => {
    expect(parsearElementos([{ id: 1, type: "node" }])).toEqual([]);
  });

  it("mapea el rubro según shop/amenity", () => {
    expect(parsearElementos([el({ name: "X", amenity: "pharmacy" })])[0].rubro).toBe("Salud");
    expect(parsearElementos([el({ name: "Y", shop: "hairdresser" })])[0].rubro).toBe("Belleza / estética");
    expect(parsearElementos([el({ name: "Z", shop: "car_repair" })])[0].rubro).toBe("Servicios");
  });

  it("cae en Comercio si el rubro no está mapeado", () => {
    expect(parsearElementos([el({ name: "W", shop: "rarisimo" })])[0].rubro).toBe("Comercio");
  });

  it("limpia el teléfono dejando solo dígitos y +", () => {
    expect(parsearElementos([el({ name: "T", shop: "kiosk", phone: "(0351) 15-555 4444" })])[0].telefono).toBe("0351155554444");
  });

  it("arma la dirección con calle y altura", () => {
    const r = parsearElementos([el({ name: "D", shop: "kiosk", "addr:street": "Av. Colón", "addr:housenumber": "1234" })]);
    expect(r[0].direccion).toBe("Av. Colón 1234");
  });

  it("el osmId identifica el elemento para deduplicar", () => {
    expect(parsearElementos([el({ name: "E", shop: "kiosk" }, 42)])[0].osmId).toBe("node/42");
  });

  it("campos faltantes quedan vacíos, no undefined", () => {
    const r = parsearElementos([el({ name: "F", shop: "kiosk" })])[0];
    expect(r.email).toBe("");
    expect(r.website).toBe("");
    expect(r.direccion).toBe("");
  });
});

describe("consultaOverpass", () => {
  it("incluye la bbox y pide solo tags", () => {
    const q = consultaOverpass([-31.5, -64.3, -31.32, -64.1]);
    expect(q).toContain("-31.5,-64.3,-31.32,-64.1");
    expect(q).toContain("out tags;");
    expect(q).toContain("[out:json]");
  });

  it("todas las zonas tienen bbox con sur < norte y oeste < este", () => {
    for (const z of ZONAS_OSM) {
      const [sur, oeste, norte, este] = z.bbox;
      expect(sur, z.nombre).toBeLessThan(norte);
      expect(oeste, z.nombre).toBeLessThan(este);
    }
  });
});
