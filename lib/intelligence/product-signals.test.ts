import { describe, it, expect } from "vitest";
import { detectarSenales, caidaEntre, MIN_UNIDADES, type Evidencia } from "./product-signals";

const base: Evidencia = {
  negocios: { total: 100, sinPublicarNunca: 0, unaSolaVezYNoVolvieron: 0, enPlanPago: 0 },
  busquedas: { activas: 10, vencidasRecientes: 0, vencidasSinPostulaciones: 0 },
  postulantes: { total: 100, incompletos: 0 },
  captacion: { sembrados: 0, conInteres: 0, contactados: 0 },
  objetivos: null,
};
const con = (over: Partial<Evidencia>): Evidencia => ({ ...base, ...over });

describe("caidaEntre", () => {
  it("calcula el porcentaje perdido", () => {
    expect(caidaEntre(100, 20)).toBe(80);
  });

  // Sin piso, 1 de 2 casos parece "50% de caída" y dispara alarmas falsas.
  it("devuelve null por debajo del piso de evidencia", () => {
    expect(caidaEntre(MIN_UNIDADES - 1, 0)).toBeNull();
  });

  it("no rompe con cero", () => {
    expect(caidaEntre(0, 0)).toBeNull();
  });
});

describe("detectarSenales — captación", () => {
  // Regresión del caso real (2026-07-24): 986 negocios sembrados, 11 con
  // candidatos interesados, 0 contactados. El embudo no se cortaba por un
  // problema de UX sino porque el paso siguiente es manual y nadie lo daba.
  it("avisa cuando hay interés y nadie contactó a ningún negocio", () => {
    const r = detectarSenales(con({ captacion: { sembrados: 986, conInteres: 11, contactados: 0 } }));
    const h = r.find((x) => x.id === "captacion-sin-contactar");
    expect(h?.severidad).toBe("alta");
    expect(h?.evidencia).toContain("11");
    expect(h?.evidencia).toContain("986");
  });

  // Es un conteo de oportunidades sin usar, no un porcentaje: no se le aplica
  // el tope de muestra chica.
  it("con un solo negocio interesado ya avisa, y en alta", () => {
    const r = detectarSenales(con({ captacion: { sembrados: 50, conInteres: 1, contactados: 0 } }));
    const h = r.find((x) => x.id === "captacion-sin-contactar");
    expect(h?.severidad).toBe("alta");
    expect(h?.muestraChica).toBe(false);
  });

  it("deja de avisar apenas se contactó a alguien", () => {
    const r = detectarSenales(con({ captacion: { sembrados: 986, conInteres: 11, contactados: 1 } }));
    expect(r.map((h) => h.id)).not.toContain("captacion-sin-contactar");
  });

  it("no avisa si no hay interés de nadie", () => {
    const r = detectarSenales(con({ captacion: { sembrados: 986, conInteres: 0, contactados: 0 } }));
    expect(r.map((h) => h.id)).not.toContain("captacion-sin-contactar");
  });
});

describe("detectarSenales", () => {
  it("sin problemas, no inventa hallazgos", () => {
    expect(detectarSenales(base)).toEqual([]);
  });

  it("detecta empresas que se registran y nunca publican", () => {
    const r = detectarSenales(con({ negocios: { ...base.negocios, sinPublicarNunca: 65 } }));
    expect(r.map((h) => h.id)).toContain("empresas-sin-activar");
    expect(r[0].severidad).toBe("alta");
    expect(r[0].evidencia).toContain("65 de 100");
    expect(r[0].muestraChica).toBe(false);
  });

  // Regresión de la primera corrida real (2026-07-24): con 5 negocios el
  // detector reportó "alta" por 3 casos. Sobre el piso pero sin significado.
  it("nunca marca alta con muestra chica, por más extremo que sea el porcentaje", () => {
    const r = detectarSenales(
      con({ negocios: { total: 5, sinPublicarNunca: 5, unaSolaVezYNoVolvieron: 0, enPlanPago: 0 } }),
    );
    const h = r.find((x) => x.id === "empresas-sin-activar");
    expect(h?.severidad).toBe("media");
    expect(h?.muestraChica).toBe(true);
    expect(h?.muestra).toBe(5);
  });

  it("un embudo con muestra chica tampoco llega a alta", () => {
    const r = detectarSenales(con({ objetivos: { recruiter_panel: 7, recruiter_contactar: 0 } }));
    const h = r.find((x) => x.id === "embudo-recruiter");
    expect(h?.severidad).toBe("media");
    expect(h?.muestraChica).toBe(true);
  });

  it("con muestra grande sí llega a alta", () => {
    const r = detectarSenales(con({ objetivos: { sourced_ver: 200, sourced_reclamar_ok: 0 } }));
    const h = r.find((x) => x.id === "embudo-sourced");
    expect(h?.severidad).toBe("alta");
    expect(h?.muestraChica).toBe(false);
  });

  it("baja la severidad cuando el problema es moderado", () => {
    const r = detectarSenales(con({ negocios: { ...base.negocios, sinPublicarNunca: 45 } }));
    expect(r.find((h) => h.id === "empresas-sin-activar")?.severidad).toBe("media");
  });

  it("no dispara por debajo del umbral", () => {
    const r = detectarSenales(con({ negocios: { ...base.negocios, sinPublicarNunca: 30 } }));
    expect(r.map((h) => h.id)).not.toContain("empresas-sin-activar");
  });

  // El piso importa más que el umbral: con 3 negocios cualquier porcentaje
  // es ruido, por más alto que sea.
  it("respeta el piso de evidencia aunque el porcentaje sea altísimo", () => {
    const r = detectarSenales(
      con({ negocios: { total: 3, sinPublicarNunca: 3, unaSolaVezYNoVolvieron: 3, enPlanPago: 0 } }),
    );
    expect(r).toEqual([]);
  });

  it("detecta empresas que no vuelven", () => {
    const r = detectarSenales(con({ negocios: { ...base.negocios, unaSolaVezYNoVolvieron: 55 } }));
    const h = r.find((x) => x.id === "empresas-no-vuelven");
    expect(h?.severidad).toBe("alta");
  });

  it("detecta búsquedas que vencen sin postulaciones", () => {
    const r = detectarSenales(
      con({ busquedas: { activas: 5, vencidasRecientes: 20, vencidasSinPostulaciones: 12 } }),
    );
    const h = r.find((x) => x.id === "busquedas-sin-postulaciones");
    expect(h?.severidad).toBe("alta");
    expect(h?.evidencia).toContain("12 de 20");
  });

  it("detecta perfiles incompletos como señal del lado postulante", () => {
    const r = detectarSenales(con({ postulantes: { total: 100, incompletos: 60 } }));
    const h = r.find((x) => x.id === "perfiles-incompletos");
    expect(h?.lado).toBe("postulante");
  });

  it("detecta la caída del embudo de reclutador", () => {
    const r = detectarSenales(con({ objetivos: { recruiter_panel: 100, recruiter_contactar: 5 } }));
    const h = r.find((x) => x.id === "embudo-recruiter");
    expect(h?.severidad).toBe("alta");
    expect(h?.evidencia).toContain("95%");
  });

  it("no dispara el embudo de reclutador si la conversión es sana", () => {
    const r = detectarSenales(con({ objetivos: { recruiter_panel: 100, recruiter_contactar: 50 } }));
    expect(r.map((h) => h.id)).not.toContain("embudo-recruiter");
  });

  it("detecta que la captación de empresas no cierra", () => {
    const r = detectarSenales(con({ objetivos: { sourced_ver: 200, sourced_reclamar_ok: 1 } }));
    expect(r.find((x) => x.id === "embudo-sourced")?.severidad).toBe("alta");
  });

  it("tolera que Plausible no esté configurado", () => {
    expect(() => detectarSenales(con({ objetivos: null }))).not.toThrow();
  });

  it("tolera objetivos ausentes sin romper", () => {
    expect(detectarSenales(con({ objetivos: {} }))).toEqual([]);
  });

  it("ordena por severidad, alta primero", () => {
    const r = detectarSenales(
      con({
        negocios: { total: 100, sinPublicarNunca: 65, unaSolaVezYNoVolvieron: 35, enPlanPago: 0 },
        postulantes: { total: 100, incompletos: 35 },
      }),
    );
    const sev = r.map((h) => h.severidad);
    expect(sev).toEqual([...sev].sort((a, b) => ({ alta: 0, media: 1, baja: 2 })[a] - ({ alta: 0, media: 1, baja: 2 })[b]));
    expect(r[0].severidad).toBe("alta");
  });

  it("todo hallazgo trae evidencia numérica, no una opinión", () => {
    const r = detectarSenales(
      con({ negocios: { total: 100, sinPublicarNunca: 65, unaSolaVezYNoVolvieron: 55, enPlanPago: 0 } }),
    );
    expect(r.length).toBeGreaterThan(0);
    for (const h of r) expect(h.evidencia).toMatch(/\d/);
  });
});
