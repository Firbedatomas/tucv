// Detector de señales de PRODUCTO (no de SEO).
//
// El loop de SEO optimiza el lado postulante, que es el que ya tiene tráfico.
// El cuello real de TuCV es que las empresas publiquen, vuelvan y paguen -- eso
// no se arregla con metadata, se arregla con producto. Este detector mira ese
// lado.
//
// Mismo criterio que lib/intelligence/policy.ts: reglas puras, sin red y sin
// base de datos. Entra un snapshot de evidencia, salen hallazgos con su razón y
// el dato que los respalda. Eso las hace testeables y auditables -- y sobre
// todo, hace que un hallazgo se pueda discutir con el número en la mano en vez
// de "el agente dice que...".

/** A qué lado del marketplace pertenece el hallazgo. */
export type Lado = "empresa" | "postulante";

export type Severidad = "alta" | "media" | "baja";

export type Hallazgo = {
  id: string;
  lado: Lado;
  severidad: Severidad;
  titulo: string;
  /** El dato concreto que lo respalda. Sin esto no es un hallazgo, es una opinión. */
  evidencia: string;
  /** Qué habría que mirar o probar. No es una orden: el loop está en observación. */
  sugerencia: string;
  /** Sobre cuántas unidades se calculó. Expuesto para poder discutir el hallazgo. */
  muestra: number;
  /** true si la muestra es chica: el hallazgo es cualitativo, no estadístico. */
  muestraChica: boolean;
};

// Piso de evidencia: por debajo de esto los porcentajes son ruido. Es la misma
// lección del detector de SEO -- sin piso, 1 de 2 casos parece "50% de caída".
export const MIN_UNIDADES = 5;

// Por encima del piso pero por debajo de esto, el hallazgo se reporta pero NUNCA
// como "alta": con 5 negocios, "el 60% no activó" son 3 casos -- puede ser real
// o puede ser casualidad, y no hay forma de distinguirlo. Sin este tope la
// primera corrida real reportó tres "alta" sobre muestras de 5 y 7 (2026-07-24),
// que es exactamente el falso positivo que el piso pretendía evitar.
export const MIN_PARA_ALTA = 20;

function ajustar(severidad: Severidad, muestra: number): { severidad: Severidad; muestraChica: boolean } {
  const chica = muestra < MIN_PARA_ALTA;
  if (chica && severidad === "alta") return { severidad: "media", muestraChica: true };
  return { severidad, muestraChica: chica };
}

export type Evidencia = {
  negocios: {
    total: number;
    /** Registrados hace más de 7 días que nunca publicaron una búsqueda. */
    sinPublicarNunca: number;
    /** Publicaron exactamente una vez, hace más de 30 días, y no volvieron. */
    unaSolaVezYNoVolvieron: number;
    enPlanPago: number;
  };
  busquedas: {
    activas: number;
    /** Vencidas en los últimos 30 días. */
    vencidasRecientes: number;
    /** De esas vencidas, cuántas no recibieron ni una postulación. */
    vencidasSinPostulaciones: number;
  };
  postulantes: {
    total: number;
    /** Perfiles empezados pero nunca completados. */
    incompletos: number;
  };
  captacion: {
    /** Negocios sembrados por el cron de captación. */
    sembrados: number;
    /** De esos, cuántos tienen al menos un candidato interesado. */
    conInteres: number;
    /** Cuántos salieron alguna vez del estado "detected". */
    contactados: number;
  };
  /** Conteo por objetivo de Plausible (30 días). null si Plausible no está configurado. */
  objetivos: Record<string, number> | null;
};

function pct(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

/** Caída entre dos pasos consecutivos de un embudo, como porcentaje perdido. */
export function caidaEntre(desde: number, hasta: number): number | null {
  if (desde < MIN_UNIDADES) return null;
  return Math.round(((desde - hasta) / desde) * 100);
}

/**
 * Aplica las reglas al snapshot. Devuelve los hallazgos ordenados por
 * severidad (alta primero) -- el runner reporta en ese orden.
 */
export function detectarSenales(e: Evidencia): Hallazgo[] {
  const out: Hallazgo[] = [];

  // --- Activación del lado empresa: se registran y nunca publican ---
  if (e.negocios.total >= MIN_UNIDADES) {
    const p = pct(e.negocios.sinPublicarNunca, e.negocios.total);
    if (p >= 40) {
      out.push({
        id: "empresas-sin-activar",
        lado: "empresa",
        ...ajustar(p >= 60 ? "alta" : "media", e.negocios.total),
        muestra: e.negocios.total,
        titulo: "Negocios que se registran y nunca publican",
        evidencia: `${e.negocios.sinPublicarNunca} de ${e.negocios.total} negocios (${p}%) se registraron hace más de 7 días y nunca publicaron una búsqueda.`,
        sugerencia:
          "Mirar dónde abandonan en /empresa/busquedas/nueva. Es el paso donde se pierde el usuario que YA decidió entrar -- el más caro de recuperar y el más barato de arreglar.",
      });
    }
  }

  // --- Retención del lado empresa: publican una vez y no vuelven ---
  if (e.negocios.total >= MIN_UNIDADES) {
    const p = pct(e.negocios.unaSolaVezYNoVolvieron, e.negocios.total);
    if (p >= 30) {
      out.push({
        id: "empresas-no-vuelven",
        lado: "empresa",
        ...ajustar(p >= 50 ? "alta" : "media", e.negocios.total),
        muestra: e.negocios.total,
        titulo: "Negocios que publicaron una vez y no volvieron",
        evidencia: `${e.negocios.unaSolaVezYNoVolvieron} de ${e.negocios.total} negocios (${p}%) publicaron una sola búsqueda hace más de 30 días y no volvieron a publicar.`,
        sugerencia:
          "Cruzar con si esa búsqueda recibió postulaciones. Si no recibió, el problema es que TuCV no entregó valor; si recibió, el problema es que no hubo motivo para volver.",
      });
    }
  }

  // --- Valor entregado: búsquedas que vencen sin una sola postulación ---
  if (e.busquedas.vencidasRecientes >= MIN_UNIDADES) {
    const p = pct(e.busquedas.vencidasSinPostulaciones, e.busquedas.vencidasRecientes);
    if (p >= 30) {
      out.push({
        id: "busquedas-sin-postulaciones",
        lado: "empresa",
        ...ajustar(p >= 50 ? "alta" : "media", e.busquedas.vencidasRecientes),
        muestra: e.busquedas.vencidasRecientes,
        titulo: "Búsquedas que vencen sin ninguna postulación",
        evidencia: `${e.busquedas.vencidasSinPostulaciones} de ${e.busquedas.vencidasRecientes} búsquedas vencidas en los últimos 30 días (${p}%) no recibieron ni una postulación.`,
        sugerencia:
          "Es la causa raíz más probable de que un negocio no renueve: pagó (o invirtió tiempo) y no recibió nada. Ver si es falta de postulantes en esa zona/rubro o falta de difusión de la búsqueda.",
      });
    }
  }

  // --- Perfiles de postulante empezados y no terminados ---
  if (e.postulantes.total >= MIN_UNIDADES) {
    const p = pct(e.postulantes.incompletos, e.postulantes.total);
    if (p >= 30) {
      out.push({
        id: "perfiles-incompletos",
        lado: "postulante",
        ...ajustar(p >= 50 ? "media" : "baja", e.postulantes.total),
        muestra: e.postulantes.total,
        titulo: "Perfiles de postulante que quedan a medio completar",
        evidencia: `${e.postulantes.incompletos} de ${e.postulantes.total} perfiles (${p}%) están incompletos.`,
        sugerencia:
          "Un perfil incompleto no le sirve a la empresa que busca, así que resta de los dos lados. Ver en qué campo se abandona.",
      });
    }
  }

  // --- Interés caliente que nadie contactó ---
  //
  // Esta regla no mide una caída de UX: mide que el paso siguiente lo tiene
  // que dar una PERSONA y no lo está dando. Un candidato marcó "me interesa"
  // en un negocio que ni siquiera está en TuCV -- es el lead más caliente que
  // existe acá, y se enfría solo mientras nadie lo use.
  if (e.captacion.conInteres >= 1 && e.captacion.contactados === 0) {
    out.push({
      id: "captacion-sin-contactar",
      lado: "empresa",
      // A propósito NO pasa por `ajustar`: no es un porcentaje sobre una
      // muestra, es un conteo absoluto de oportunidades sin usar. Un solo
      // negocio con interés y sin contactar ya es accionable.
      severidad: "alta",
      muestra: e.captacion.conInteres,
      muestraChica: false,
      titulo: "Hay interés de candidatos que nadie usó para contactar al negocio",
      evidencia: `${e.captacion.conInteres} negocios sembrados tienen candidatos interesados y NINGUNO de los ${e.captacion.sembrados} sembrados fue contactado (todos siguen en "detected").`,
      sugerencia:
        "El embudo no se corta por un problema de producto: el paso de contactar es manual y no se está haciendo. Está en /admin/captacion, que ya trae el mensaje y el link de WhatsApp listos.",
    });
  }

  // --- Embudos de Plausible ---
  if (e.objetivos) {
    const g = e.objetivos;

    // Embudo del reclutador: entra al panel pero no contacta a nadie.
    const panel = g["recruiter_panel"] ?? 0;
    const contactar = g["recruiter_contactar"] ?? 0;
    const caidaRecruiter = caidaEntre(panel, contactar);
    if (caidaRecruiter !== null && caidaRecruiter >= 70) {
      out.push({
        id: "embudo-recruiter",
        lado: "empresa",
        ...ajustar(caidaRecruiter >= 85 ? "alta" : "media", panel),
        muestra: panel,
        titulo: "El reclutador entra al panel de candidatos pero no contacta",
        evidencia: `${panel} entraron a /empresa/candidatos y solo ${contactar} contactaron a alguien (se pierde el ${caidaRecruiter}%).`,
        sugerencia:
          "Mirar los pasos intermedios (abrir perfil, marcar visto, guardar) para ubicar en cuál se corta. Contactar es el momento en que TuCV entrega su valor: si no pasa, nada más importa.",
      });
    }

    // Embudo de captación: el candidato marca interés en una empresa que
    // todavía no está en TuCV, y la empresa tiene que reclamarla.
    const sourcedVer = g["sourced_ver"] ?? 0;
    const reclamarOk = g["sourced_reclamar_ok"] ?? 0;
    const caidaSourced = caidaEntre(sourcedVer, reclamarOk);
    if (caidaSourced !== null && caidaSourced >= 90) {
      out.push({
        id: "embudo-sourced",
        lado: "empresa",
        ...ajustar("alta", sourcedVer),
        muestra: sourcedVer,
        titulo: "La captación de empresas no cierra el círculo",
        evidencia: `${sourcedVer} vistas de empresas sembradas y solo ${reclamarOk} reclamos completados (se pierde el ${caidaSourced}%).`,
        sugerencia:
          "Este es el mecanismo pensado para resolver el cuello del negocio (conseguir empresas). Si no convierte, es la palanca más importante para arreglar antes que cualquier otra cosa.",
      });
    }
  }

  const orden: Record<Severidad, number> = { alta: 0, media: 1, baja: 2 };
  return out.sort((a, b) => orden[a.severidad] - orden[b.severidad]);
}
