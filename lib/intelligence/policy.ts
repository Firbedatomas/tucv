// Motor de políticas del growth loop autónomo.
//
// Esta es la pieza que hace que "autónomo" no signifique "sin control". Vive
// en código con tests, NO en las instrucciones del agente: un prompt es una
// sugerencia que un modelo puede malinterpretar bajo presión, o que alguien
// reescribe sin darse cuenta de qué está desactivando. Una función pura no.
//
// Todo acá es puro: sin red, sin base de datos, sin `Date.now()`. Entra una
// acción propuesta, sale un veredicto con su razón. Eso es lo que lo hace
// testeable, auditable, y reusable desde cualquier superficie (el cron, un
// panel, una corrida manual) sin que dos lugares puedan contestar distinto
// para el mismo caso.

export type Nivel = "verde" | "amarillo" | "rojo";

export type TipoAccion =
  | "editar_codigo"
  | "abrir_pr"
  | "mergear_a_main"
  | "desplegar_produccion"
  | "modificar_datos_negocio"
  | "migrar_base_de_datos"
  | "solo_diagnostico";

/** A qué lado del marketplace sirve un hallazgo. TuCV es de dos lados y el
 *  cuello real es conseguir empresas que paguen, no postulantes -- mezclarlos
 *  en una sola métrica esconde justamente el dato que importa. */
export type Lado = "empresa" | "postulante" | "ambos";

export type Accion = {
  /** Tema declarado por el agente. Es un dato que él elige: NO se le cree por
   *  encima de las rutas (ver `clasificar`). */
  tema: string;
  /** Rutas relativas al repo que la acción tocaría. Esto sí es un hecho del
   *  sistema de archivos. */
  archivos: readonly string[];
  tipo: TipoAccion;
};

export type Veredicto = {
  nivel: Nivel;
  razon: string;
  permitido: boolean;
  /** Qué puede hacer el runner con esto, ya resuelto contra la config. */
  puedeImplementar: boolean;
  puedeAbrirPR: boolean;
  puedeMergear: boolean;
};

export type Config = {
  /** Si está activo, bloquea TODO -- incluso lo verde. Sin excepción. */
  killSwitch: boolean;
  /** Techo de la corrida. `auto-merge` es una ampliación explícita, no el default. */
  techo: "solo-diagnostico" | "pr" | "auto-merge";
  /** Más archivos que esto en una sola iteración: se parte en varios cambios. */
  maxArchivos: number;
};

// ---------------------------------------------------------------------------
// Config real de TuCV
// ---------------------------------------------------------------------------

/**
 * El diseño por defecto de este motor frena en "abrir PR, nunca mergear".
 *
 * TuCV decidió, de forma explícita y consciente (2026-07-24), que este runner
 * puede auto-mergear lo verde puro y 100% validado. Queda documentado acá para
 * que quien lea esto después entienda que fue una decisión con su trade-off
 * entendido (menos fricción, menos revisión previa), no un descuido.
 *
 * La clasificación verde/amarillo/rojo NO se toca por esto: lo único que
 * cambia es qué se hace con un veredicto verde una vez obtenido.
 */
export const CONFIG_TUCV: Config = {
  killSwitch: false,
  techo: "auto-merge",
  maxArchivos: 12,
};

// ---------------------------------------------------------------------------
// Rutas sensibles: ganan sobre cualquier tema declarado
// ---------------------------------------------------------------------------

/**
 * Si la acción toca CUALQUIERA de estas rutas, es roja -- sin importar qué
 * tema haya declarado el agente. Así una acción que toca copy público *y*
 * el webhook de Mercado Pago a la vez es roja igual, por el archivo.
 */
const RUTAS_SENSIBLES: readonly RegExp[] = [
  // Pagos y plata real.
  /(^|\/)app\/api\/mercadopago\//,
  /(^|\/)lib\/mercadopago/i,
  /(^|\/)app\/api\/plan-prices\//,
  /(^|\/)lib\/plan/i,
  // Datos personales de postulantes: los perfiles llevan WhatsApp real. Es el
  // activo más delicado del sistema y no lo toca un agente solo.
  /(^|\/)lib\/anonymize/,
  /(^|\/)lib\/candidate-visibility/,
  /(^|\/)app\/p\//,
  // Autenticación, sesiones, permisos, admin.
  /(^|\/)lib\/pocketbase-admin/,
  /(^|\/)lib\/business-permissions/,
  /(^|\/)lib\/use-business-auth/,
  /(^|\/)app\/admin\//,
  /(^|\/)app\/api\/admin\//,
  /(^|\/)middleware\.(ts|js)$/,
  // Migraciones y esquema: siempre las aprueba una persona.
  /(^|\/)scripts\/pb-(migrate|create)/,
  // Infra y secretos.
  /(^|\/)\.env/,
  /(^|\/)Caddyfile/,
  /(^|\/)docker-compose/,
  /(^|\/)Dockerfile/,
  /(^|\/)scripts\/deploy\.sh$/,
  /(^|\/)\.github\/workflows\//,
  // Webhooks entrantes: son superficie de ataque.
  /(^|\/)app\/api\/webhooks\//,
  /(^|\/)lib\/rate-limit/,
];

// ---------------------------------------------------------------------------
// Temas
// ---------------------------------------------------------------------------

/**
 * Verde exige COINCIDENCIA EXACTA. Nada se cuela por parecido: un tema
 * `metadata_seo_de_precios` no matchea `metadata_seo`, y cae a la evaluación
 * de rojo por subcadena.
 */
const TEMAS_VERDES: ReadonlySet<string> = new Set([
  "metadata_seo",
  "json_ld",
  "sitemap",
  "robots",
  "llms_txt",
  "enlaces_internos",
  "copy_publico_no_sensible",
  "faq_no_legal",
  "estados_vacios",
  "tooltips_ayuda",
  "instrumentacion",
  "tests",
  "documentacion",
  "open_graph",
]);

/** Amarillo: puede prepararse en una rama, pero SIEMPRE lo revisa una persona. */
const TEMAS_AMARILLOS: ReadonlySet<string> = new Set([
  "onboarding",
  "configuracion",
  "comunicaciones_comerciales",
  "emails_transaccionales",
  "copy_de_checkout",
  "limites_de_plan",
]);

/**
 * Contaminación hacia lo rojo: si el tema CONTIENE alguna de estas subcadenas,
 * es rojo aunque además figure en la lista verde. Es a propósito asimétrico
 * -- verde pide match exacto, rojo alcanza con parecerse.
 */
const PALABRAS_ROJAS: readonly string[] = [
  "precio",
  "pago",
  "cobro",
  "factura",
  "fiscal",
  "impuesto",
  "mercadopago",
  "checkout",
  "seguridad",
  "permiso",
  "auth",
  "sesion",
  "secreto",
  "credencial",
  "migracion",
  "esquema",
  "whatsapp",
  "telefono",
  "dato_personal",
  "legal",
  "terminos",
  "privacidad",
];

/** Nunca permitidos, en ningún nivel, en ninguna fase. */
const TIPOS_PROHIBIDOS: ReadonlySet<TipoAccion> = new Set<TipoAccion>([
  "desplegar_produccion",
  "modificar_datos_negocio",
  "migrar_base_de_datos",
]);

// ---------------------------------------------------------------------------

function normalizarTema(tema: string): string {
  return tema
    .toLowerCase()
    .trim()
    // Acentos fuera: `migración` y `migracion` tienen que colisionar igual
    // contra la lista de palabras rojas.
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function esRutaSensible(archivo: string): boolean {
  const limpio = archivo.replace(/^\.\//, "").replace(/^\/+/, "");
  return RUTAS_SENSIBLES.some((re) => re.test(limpio));
}

/**
 * Clasifica una acción. Fail-closed: lo que no está explícitamente permitido
 * cae en rojo, nunca al revés.
 */
export function clasificar(accion: Accion): { nivel: Nivel; razon: string } {
  const tema = normalizarTema(accion.tema);

  // 1. Tipos que nunca se permiten, sin importar nada más.
  if (TIPOS_PROHIBIDOS.has(accion.tipo)) {
    return { nivel: "rojo", razon: `tipo de acción prohibido en cualquier nivel: ${accion.tipo}` };
  }

  // 2. La ruta manda sobre el tema declarado. Va ANTES de mirar el tema a
  //    propósito: el agente elige el tema, no elige qué archivo es sensible.
  const sensible = accion.archivos.find((a) => esRutaSensible(a));
  if (sensible) {
    return { nivel: "rojo", razon: `toca una ruta sensible: ${sensible}` };
  }

  // 3. Sin archivos declarados no se puede verificar nada -> fail-closed.
  if (accion.archivos.length === 0 && accion.tipo !== "solo_diagnostico") {
    return { nivel: "rojo", razon: "no declaró qué archivos toca" };
  }

  // 4. Contaminación por subcadena hacia lo rojo.
  const palabra = PALABRAS_ROJAS.find((p) => tema.includes(p));
  if (palabra) {
    return { nivel: "rojo", razon: `el tema contiene "${palabra}", que es material sensible` };
  }

  // 5. Verde solo por coincidencia exacta.
  if (TEMAS_VERDES.has(tema)) {
    return { nivel: "verde", razon: `tema habilitado: ${tema}` };
  }
  if (TEMAS_AMARILLOS.has(tema)) {
    return { nivel: "amarillo", razon: `tema que requiere revisión humana: ${tema}` };
  }

  // 6. Default: lo no clasificado es rojo.
  return { nivel: "rojo", razon: `tema no clasificado ("${tema}"): por defecto va a rojo` };
}

/**
 * Resuelve qué puede hacer el runner con una acción, cruzando la
 * clasificación con la config (kill switch, techo, límite de archivos).
 */
export function evaluar(accion: Accion, config: Config = CONFIG_TUCV): Veredicto {
  const bloqueado = (nivel: Nivel, razon: string): Veredicto => ({
    nivel,
    razon,
    permitido: false,
    puedeImplementar: false,
    puedeAbrirPR: false,
    puedeMergear: false,
  });

  // El kill switch gana sobre todo, incluso sobre lo verde.
  if (config.killSwitch) {
    return bloqueado("rojo", "kill switch activo: todo bloqueado");
  }

  const { nivel, razon } = clasificar(accion);

  if (nivel === "rojo") return bloqueado("rojo", razon);

  if (accion.archivos.length > config.maxArchivos) {
    return bloqueado(
      nivel,
      `toca ${accion.archivos.length} archivos, el máximo por iteración es ${config.maxArchivos}`,
    );
  }

  if (config.techo === "solo-diagnostico") {
    return bloqueado(nivel, "el techo de esta corrida es solo diagnóstico");
  }

  if (nivel === "amarillo") {
    // Amarillo prepara la rama y abre PR, pero NUNCA mergea -- ni siquiera con
    // techo auto-merge. El auto-merge se amplió solo para verde.
    return {
      nivel,
      razon,
      permitido: true,
      puedeImplementar: true,
      puedeAbrirPR: true,
      puedeMergear: false,
    };
  }

  return {
    nivel: "verde",
    razon,
    permitido: true,
    puedeImplementar: true,
    puedeAbrirPR: true,
    puedeMergear: config.techo === "auto-merge",
  };
}
