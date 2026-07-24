import { describe, it, expect } from "vitest";
import { clasificar, evaluar, esRutaSensible, CONFIG_TUCV, type Accion, type Config } from "./policy";

const accion = (over: Partial<Accion> = {}): Accion => ({
  tema: "metadata_seo",
  archivos: ["app/robots.ts"],
  tipo: "editar_codigo",
  ...over,
});

describe("esRutaSensible", () => {
  it.each([
    "app/api/mercadopago/webhook/route.ts",
    "lib/pocketbase-admin.ts",
    "lib/business-permissions.ts",
    "app/admin/(dashboard)/negocios/page.tsx",
    "middleware.ts",
    "scripts/pb-migrate-payments.mjs",
    "scripts/deploy.sh",
    ".env",
    "Caddyfile",
    "app/p/[slug]/page.tsx",
    "lib/anonymize.ts",
    "app/api/webhooks/resend/route.ts",
  ])("marca %s como sensible", (ruta) => {
    expect(esRutaSensible(ruta)).toBe(true);
  });

  it.each(["app/robots.ts", "app/sitemap.ts", "lib/json-ld.ts", "public/llms.txt", "lib/indexnow.ts"])(
    "deja pasar %s",
    (ruta) => {
      expect(esRutaSensible(ruta)).toBe(false);
    },
  );

  it("normaliza el prefijo ./ y / antes de comparar", () => {
    expect(esRutaSensible("./.env")).toBe(true);
    expect(esRutaSensible("/lib/pocketbase-admin.ts")).toBe(true);
  });
});

describe("clasificar", () => {
  it("verde por coincidencia exacta de tema", () => {
    expect(clasificar(accion()).nivel).toBe("verde");
  });

  it("amarillo para temas que piden revisión humana", () => {
    expect(clasificar(accion({ tema: "onboarding" })).nivel).toBe("amarillo");
  });

  // El corazón del motor: el agente elige el tema, no elige qué archivo es
  // sensible. Una acción "de copy" que además toca pagos es roja por el archivo.
  it("la ruta manda sobre el tema declarado", () => {
    const v = clasificar(
      accion({ tema: "copy_publico_no_sensible", archivos: ["app/page.tsx", "lib/mercadopago.ts"] }),
    );
    expect(v.nivel).toBe("rojo");
    expect(v.razon).toContain("ruta sensible");
  });

  it("contamina hacia rojo por subcadena, aunque suene inocente", () => {
    expect(clasificar(accion({ tema: "copy_publico_de_precios" })).nivel).toBe("rojo");
    expect(clasificar(accion({ tema: "faq_de_facturacion" })).nivel).toBe("rojo");
    expect(clasificar(accion({ tema: "metadata_seo_de_checkout" })).nivel).toBe("rojo");
  });

  it("la contaminación ignora acentos", () => {
    expect(clasificar(accion({ tema: "migración_de_datos" })).nivel).toBe("rojo");
  });

  it("verde NO acepta parecidos, solo match exacto", () => {
    expect(clasificar(accion({ tema: "metadata_seo_avanzada" })).nivel).toBe("rojo");
    expect(clasificar(accion({ tema: "tests_y_otras_cosas" })).nivel).toBe("rojo");
  });

  it("fail-closed: tema desconocido es rojo", () => {
    const v = clasificar(accion({ tema: "algo_que_nadie_clasifico" }));
    expect(v.nivel).toBe("rojo");
    expect(v.razon).toContain("no clasificado");
  });

  it("fail-closed: sin archivos declarados es rojo", () => {
    expect(clasificar(accion({ archivos: [] })).nivel).toBe("rojo");
  });

  it("permite diagnóstico sin archivos", () => {
    expect(clasificar(accion({ tipo: "solo_diagnostico", archivos: [] })).nivel).toBe("verde");
  });

  it.each(["desplegar_produccion", "modificar_datos_negocio", "migrar_base_de_datos"] as const)(
    "%s está prohibido aunque el tema sea verde",
    (tipo) => {
      const v = clasificar(accion({ tipo }));
      expect(v.nivel).toBe("rojo");
      expect(v.razon).toContain("prohibido");
    },
  );

  it("no distingue mayúsculas ni espacios sobrantes", () => {
    expect(clasificar(accion({ tema: "  METADATA_SEO " })).nivel).toBe("verde");
  });
});

describe("evaluar", () => {
  const conf = (over: Partial<Config> = {}): Config => ({ ...CONFIG_TUCV, ...over });

  it("verde con techo auto-merge puede mergear", () => {
    const v = evaluar(accion(), conf({ techo: "auto-merge" }));
    expect(v).toMatchObject({ nivel: "verde", puedeImplementar: true, puedeAbrirPR: true, puedeMergear: true });
  });

  it("verde con techo pr abre PR pero no mergea", () => {
    expect(evaluar(accion(), conf({ techo: "pr" })).puedeMergear).toBe(false);
  });

  // La ampliación de autonomía fue solo para verde: amarillo sigue pidiendo
  // una persona incluso con el techo más alto.
  it("amarillo NUNCA mergea, ni con techo auto-merge", () => {
    const v = evaluar(accion({ tema: "onboarding" }), conf({ techo: "auto-merge" }));
    expect(v.puedeAbrirPR).toBe(true);
    expect(v.puedeMergear).toBe(false);
  });

  it("el kill switch bloquea incluso lo verde", () => {
    const v = evaluar(accion(), conf({ killSwitch: true }));
    expect(v.permitido).toBe(false);
    expect(v.puedeImplementar).toBe(false);
    expect(v.puedeMergear).toBe(false);
    expect(v.razon).toContain("kill switch");
  });

  it("el techo solo-diagnostico bloquea la implementación", () => {
    expect(evaluar(accion(), conf({ techo: "solo-diagnostico" })).permitido).toBe(false);
  });

  it("corta si supera el máximo de archivos por iteración", () => {
    const muchos = Array.from({ length: 20 }, (_, i) => `app/seccion-${i}/page.tsx`);
    const v = evaluar(accion({ archivos: muchos }), conf({ maxArchivos: 12 }));
    expect(v.permitido).toBe(false);
    expect(v.razon).toContain("máximo por iteración");
  });

  it("rojo nunca puede nada", () => {
    const v = evaluar(accion({ archivos: [".env"] }));
    expect(v).toMatchObject({ permitido: false, puedeImplementar: false, puedeAbrirPR: false, puedeMergear: false });
  });

  it("la config real de TuCV arranca sin kill switch y con auto-merge", () => {
    expect(CONFIG_TUCV.killSwitch).toBe(false);
    expect(CONFIG_TUCV.techo).toBe("auto-merge");
  });
});
