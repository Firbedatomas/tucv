import { describe, it, expect } from "vitest";
import { cityLabelFromSlug, cityTextFromSlug, toTitleCase, zoneMatchesCity } from "./city";

describe("cityLabelFromSlug", () => {
  // El motivo del cambio: el sitemap publicó /trabajo/cordoba y el título
  // decía "Trabajo en Cordoba", sin tilde.
  it("devuelve el nombre con acento para localidades conocidas", () => {
    expect(cityLabelFromSlug("cordoba")).toBe("Córdoba");
    expect(cityLabelFromSlug("tucuman")).toBe("Tucumán");
    expect(cityLabelFromSlug("neuquen")).toBe("Neuquén");
    expect(cityLabelFromSlug("rio-cuarto")).toBe("Río Cuarto");
  });

  it("respeta las partículas en minúscula", () => {
    expect(cityLabelFromSlug("mar-del-plata")).toBe("Mar del Plata");
    expect(cityLabelFromSlug("santiago-del-estero")).toBe("Santiago del Estero");
  });

  it("para localidades sin acento devuelve lo mismo que antes", () => {
    expect(cityLabelFromSlug("villa-allende")).toBe("Villa Allende");
    expect(cityLabelFromSlug("rosario")).toBe("Rosario");
  });

  // El fallback tiene que dejar un título correcto igual: una localidad que
  // no está en la lista no puede producir algo roto.
  it("cae en title case para localidades desconocidas", () => {
    expect(cityLabelFromSlug("pueblo-nuevo")).toBe("Pueblo Nuevo");
    expect(cityLabelFromSlug("el-dorado")).toBe("El Dorado");
  });

  it("el fallback también respeta las partículas", () => {
    expect(cityLabelFromSlug("villa-de-las-rosas")).toBe("Villa de las Rosas");
  });

  it("no distingue mayúsculas en el slug de entrada", () => {
    expect(cityLabelFromSlug("CORDOBA")).toBe("Córdoba");
  });

  it("no rompe con entrada vacía", () => {
    expect(cityLabelFromSlug("")).toBe("");
  });
});

describe("toTitleCase", () => {
  it("capitaliza la primera palabra aunque sea partícula", () => {
    expect(toTitleCase("la calera")).toBe("La Calera");
    expect(toTitleCase("el dorado")).toBe("El Dorado");
  });

  it("deja las partículas del medio en minúscula", () => {
    expect(toTitleCase("mar del plata")).toBe("Mar del Plata");
  });
});

describe("cityTextFromSlug", () => {
  it("convierte el slug en needle de búsqueda", () => {
    expect(cityTextFromSlug("villa-allende")).toBe("villa allende");
  });
});

describe("zoneMatchesCity", () => {
  // El label ahora lleva acento, pero el match tiene que seguir siendo
  // insensible: la zona la escribe el usuario a mano.
  it("matchea ignorando acentos", () => {
    expect(zoneMatchesCity("El Dorado 68, Villa Allende, Córdoba", "cordoba")).toBe(true);
  });

  it("matchea por substring", () => {
    expect(zoneMatchesCity("Córdoba Capital", "cordoba")).toBe(true);
  });

  it("no matchea otra ciudad", () => {
    expect(zoneMatchesCity("Rosario, Santa Fe", "cordoba")).toBe(false);
  });

  it("sin ciudad, matchea todo", () => {
    expect(zoneMatchesCity("cualquier cosa", "")).toBe(true);
  });
});
