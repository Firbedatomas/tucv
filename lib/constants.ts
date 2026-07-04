export type Option = { value: string; label: string };

// Preguntas filtro por búsqueda -- las define la empresa al publicar, las
// responde el postulante al postularse (ver app/b/[slug]). El peso define
// cuánto suma cada respuesta "sí" al score que ordena el panel de
// postulantes; las de tipo texto no puntúan (son para leer, no para
// filtrar automático -- una respuesta libre no se puede puntuar sola).
export type ScreeningQuestionType = "si_no" | "texto";
export type ScreeningWeight = "alto" | "medio" | "bajo";
export type ScreeningQuestion = {
  id: string;
  question: string;
  type: ScreeningQuestionType;
  weight: ScreeningWeight;
};
export type ScreeningAnswer = { questionId: string; answer: string };

export const SCREENING_QUESTION_TYPE: Option[] = [
  { value: "si_no", label: "Sí / No" },
  { value: "texto", label: "Respuesta libre" },
];

export const SCREENING_WEIGHT: Option[] = [
  { value: "alto", label: "Alto impacto" },
  { value: "medio", label: "Impacto medio" },
  { value: "bajo", label: "Impacto bajo" },
];

export const SCREENING_WEIGHT_POINTS: Record<ScreeningWeight, number> = {
  alto: 3,
  medio: 2,
  bajo: 1,
};

export const MAX_SCREENING_QUESTIONS = 5;

export function computeScreeningScore(
  questions: ScreeningQuestion[],
  answers: ScreeningAnswer[],
): number {
  let score = 0;
  for (const q of questions) {
    if (q.type !== "si_no") continue;
    const answer = answers.find((a) => a.questionId === q.id);
    if (answer?.answer === "si") score += SCREENING_WEIGHT_POINTS[q.weight];
  }
  return score;
}

export const CATEGORIES: Option[] = [
  { value: "atencion", label: "Atención al público" },
  { value: "ventas", label: "Ventas" },
  { value: "caja", label: "Caja" },
  { value: "reposicion", label: "Reposición" },
  { value: "limpieza", label: "Limpieza" },
  { value: "deposito", label: "Depósito" },
  { value: "reparto", label: "Reparto" },
  { value: "seguridad", label: "Seguridad" },
  { value: "cuidado", label: "Cuidado de personas" },
  { value: "construccion", label: "Construcción" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "taller_oficio", label: "Taller / oficio" },
  { value: "cocina", label: "Cocina" },
  { value: "moza_mozo", label: "Moza/o" },
  { value: "barista", label: "Barista" },
  { value: "administracion_basica", label: "Administración básica" },
  { value: "produccion_operario", label: "Producción / operario" },
  { value: "jardineria", label: "Jardinería" },
  { value: "pintura", label: "Pintura" },
  { value: "plomeria", label: "Plomería" },
  { value: "electricidad", label: "Electricidad" },
  { value: "peluqueria_estetica", label: "Peluquería / estética" },
  { value: "eventos", label: "Eventos" },
  { value: "recepcion_conserje", label: "Recepción / conserje" },
  { value: "chofer", label: "Chofer" },
  { value: "delivery_moto", label: "Delivery en moto" },
  { value: "ninera", label: "Niñera/o" },
  { value: "costura", label: "Costura" },
  { value: "panaderia", label: "Panadería" },
  { value: "otro", label: "Otro" },
];

// Sugerencias de nombre de puesto por rubro -- no reemplazan el campo de
// texto libre "Puesto" (queda editable), son atajos para que dos negocios
// con la misma necesidad ("moza" / "mozo de salón") converjan al mismo
// nombre sin forzar un select cerrado.
export const ROLE_SUGGESTIONS_BY_CATEGORY: Record<string, string[]> = {
  atencion: ["Vendedor/a", "Asesor/a de atención al cliente", "Promotor/a"],
  ventas: ["Vendedor/a", "Asesor/a comercial", "Encargado/a de ventas"],
  caja: ["Cajero/a", "Cajero/a repositor/a"],
  reposicion: ["Repositor/a", "Repositor/a de góndola"],
  limpieza: ["Personal de limpieza", "Mucama/o", "Encargado/a de limpieza"],
  deposito: ["Ayudante de depósito", "Encargado/a de depósito", "Pañolero/a"],
  reparto: ["Repartidor/a", "Delivery", "Chofer repartidor/a"],
  seguridad: ["Personal de seguridad", "Vigilador/a"],
  cuidado: ["Cuidador/a de personas mayores", "Acompañante terapéutico/a"],
  construccion: ["Ayudante de construcción", "Oficial albañil", "Medio oficial"],
  mantenimiento: ["Personal de mantenimiento", "Encargado/a de mantenimiento"],
  taller_oficio: ["Ayudante de taller", "Oficial de taller"],
  cocina: ["Ayudante de cocina", "Cocinero/a", "Bachero/a"],
  moza_mozo: ["Mozo/a de salón", "Camarero/a", "Runner"],
  barista: ["Barista", "Ayudante de cafetería"],
  administracion_basica: ["Administrativo/a", "Recepcionista", "Auxiliar administrativo/a"],
  produccion_operario: ["Operario/a de producción", "Ayudante de fábrica"],
  jardineria: ["Jardinero/a", "Ayudante de jardinería"],
  pintura: ["Pintor/a", "Ayudante de pintura"],
  plomeria: ["Plomero/a", "Ayudante de plomería"],
  electricidad: ["Electricista", "Ayudante de electricidad"],
  peluqueria_estetica: ["Peluquero/a", "Estilista", "Manicurista"],
  eventos: ["Mozo/a de eventos", "Ayudante de eventos", "Bartender"],
  recepcion_conserje: ["Recepcionista", "Conserje"],
  chofer: ["Chofer", "Chofer con moto propia"],
  delivery_moto: ["Repartidor/a en moto"],
  ninera: ["Niñera/o", "Cuidador/a de niños"],
  costura: ["Costurera/o", "Ayudante de costura"],
  panaderia: ["Panadero/a", "Ayudante de panadería"],
};

// Idem para tareas principales: el vocabulario depende del rubro, así que
// va en JSON (no un select con valores fijos) -- mismo criterio que perks.
export const TASK_SUGGESTIONS_BY_CATEGORY: Record<string, Option[]> = {
  atencion: [
    { value: "atencion_publico", label: "Atención al público" },
    { value: "asesoramiento", label: "Asesoramiento" },
    { value: "manejo_caja", label: "Manejo de caja" },
    { value: "apertura_cierre", label: "Apertura/cierre" },
  ],
  ventas: [
    { value: "atencion_cliente", label: "Atención al cliente" },
    { value: "cierre_ventas", label: "Cierre de ventas" },
    { value: "manejo_caja", label: "Manejo de caja" },
    { value: "reposicion", label: "Reposición" },
  ],
  caja: [
    { value: "manejo_caja", label: "Manejo de caja" },
    { value: "atencion_publico", label: "Atención al público" },
    { value: "apertura_cierre", label: "Apertura/cierre de caja" },
    { value: "arqueo", label: "Arqueo" },
  ],
  moza_mozo: [
    { value: "atencion_mesa", label: "Atención en mesa" },
    { value: "manejo_bandeja", label: "Manejo de bandeja" },
    { value: "limpieza_salon", label: "Limpieza de salón" },
    { value: "cobro", label: "Cobro" },
    { value: "cafeteria", label: "Cafetería" },
    { value: "comandas", label: "Comandas" },
    { value: "apertura_cierre", label: "Apertura/cierre" },
    { value: "reposicion", label: "Reposición" },
  ],
  cocina: [
    { value: "preparacion_platos", label: "Preparación de platos" },
    { value: "mise_en_place", label: "Mise en place" },
    { value: "limpieza_cocina", label: "Limpieza de cocina" },
    { value: "control_stock", label: "Control de stock" },
  ],
  barista: [
    { value: "preparacion_cafe", label: "Preparación de café" },
    { value: "atencion_barra", label: "Atención de barra" },
    { value: "limpieza_barra", label: "Limpieza de barra" },
    { value: "cobro", label: "Cobro" },
  ],
  limpieza: [
    { value: "limpieza_general", label: "Limpieza general" },
    { value: "limpieza_banos", label: "Limpieza de baños" },
    { value: "manejo_insumos", label: "Manejo de insumos de limpieza" },
  ],
  deposito: [
    { value: "carga_descarga", label: "Carga y descarga" },
    { value: "control_stock", label: "Control de stock" },
    { value: "armado_pedidos", label: "Armado de pedidos" },
    { value: "orden_deposito", label: "Orden del depósito" },
  ],
  reparto: [
    { value: "entrega_pedidos", label: "Entrega de pedidos" },
    { value: "cobro", label: "Cobro" },
    { value: "carga_descarga", label: "Carga y descarga" },
  ],
  administracion_basica: [
    { value: "atencion_telefonica", label: "Atención telefónica" },
    { value: "carga_datos", label: "Carga de datos" },
    { value: "archivo", label: "Archivo y documentación" },
    { value: "facturacion", label: "Facturación básica" },
  ],
  construccion: [
    { value: "ayudante_general", label: "Ayudante general de obra" },
    { value: "carga_descarga", label: "Carga y descarga de materiales" },
    { value: "orden_obra", label: "Orden de obra" },
  ],
  seguridad: [
    { value: "control_acceso", label: "Control de acceso" },
    { value: "rondas", label: "Rondas de vigilancia" },
    { value: "monitoreo_camaras", label: "Monitoreo de cámaras" },
  ],
};

const GENERIC_TASK_SUGGESTIONS: Option[] = [
  { value: "atencion_publico", label: "Atención al público" },
  { value: "limpieza_orden", label: "Limpieza y orden" },
  { value: "carga_descarga", label: "Carga y descarga" },
  { value: "tareas_administrativas", label: "Tareas administrativas" },
];

export function taskSuggestionsFor(category: string): Option[] {
  return TASK_SUGGESTIONS_BY_CATEGORY[category] ?? GENERIC_TASK_SUGGESTIONS;
}

export const EXPERIENCE: Option[] = [
  { value: "sin_experiencia", label: "Sin experiencia" },
  { value: "menos_6_meses", label: "Menos de 6 meses" },
  { value: "6_a_12_meses", label: "6 a 12 meses" },
  { value: "1_a_3_anos", label: "1 a 3 años" },
  { value: "mas_3_anos", label: "Más de 3 años" },
];

const EXPERIENCE_RANK: Record<string, number> = {
  sin_experiencia: 0,
  menos_6_meses: 1,
  "6_a_12_meses": 2,
  "1_a_3_anos": 3,
  mas_3_anos: 4,
};

// La experiencia ahora se carga por rubro (category_experience). Este
// helper computa un valor "general" de respaldo (el más alto entre todos
// los rubros) para el campo legacy `experience`, usado como fallback donde
// todavía no tiene sentido pedir el rubro puntual (ej. orden en listados).
export function highestExperience(values: string[]): string {
  return values.reduce(
    (best, v) => ((EXPERIENCE_RANK[v] ?? 0) > (EXPERIENCE_RANK[best] ?? 0) ? v : best),
    "sin_experiencia",
  );
}

export const STUDY_LEVELS: Option[] = [
  { value: "primario", label: "Primario" },
  { value: "secundario", label: "Secundario" },
  { value: "terciario", label: "Terciario" },
  { value: "universitario", label: "Universitario" },
];

export const STUDY_STATUS: Option[] = [
  { value: "completo", label: "Completo" },
  { value: "incompleto", label: "Incompleto" },
];

export const AVAILABILITY: Option[] = [
  { value: "manana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
  { value: "noche", label: "Noche" },
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "fines_semana", label: "Fines de semana" },
  { value: "feriados", label: "Feriados" },
];

// Condiciones/beneficios del puesto, opcionales -- las carga la empresa al
// publicar la búsqueda y se muestran como info extra en el link público,
// para que el postulante sepa esto antes de aplicar (no solo puesto/turno).
export const JOB_PERKS: Option[] = [
  { value: "obra_social", label: "Ofrece obra social" },
  { value: "en_blanco", label: "Trabajo registrado (en blanco)" },
  { value: "turno_cortado", label: "Turno cortado" },
  { value: "movilidad_propia", label: "Requiere movilidad propia" },
  { value: "comida_incluida", label: "Comida incluida" },
];

// Presets de días -- se combinan con un horario aproximado (texto libre
// corto, ej. "8 a 16hs") para armar schedule_details. Cubren la mayoría de
// los casos sin forzar un formato rígido para el horario, que varía mucho.
export const DAY_PATTERNS: Option[] = [
  { value: "lunes_a_viernes", label: "Lunes a viernes" },
  { value: "lunes_a_sabado", label: "Lunes a sábado" },
  { value: "fines_semana", label: "Fines de semana" },
  { value: "todos_los_dias", label: "Todos los días" },
  { value: "con_franco_semanal", label: "Con franco semanal" },
];

// Sugerencias rápidas para el chip input de horario -- no es una lista
// cerrada (TagInput deja escribir cualquier cosa), son solo atajos para los
// casos más comunes.
export const SCHEDULE_HOURS_SUGGESTIONS: string[] = [
  "Mañana (8 a 13hs)",
  "Tarde (14 a 20hs)",
  "Turno cortado",
  "Full time",
  "A coordinar",
];

export const SALARY_MODE: Option[] = [
  { value: "mostrar", label: "Mostrar el sueldo" },
  { value: "no_mostrar", label: "No mostrar el sueldo" },
  { value: "a_convenir", label: "A convenir" },
  { value: "segun_convenio", label: "Según convenio" },
];

export const VACANCIES: Option[] = [
  { value: "1", label: "1 persona" },
  { value: "2", label: "2 personas" },
  { value: "3_o_mas", label: "3 o más" },
  { value: "no_seguro", label: "Todavía no sé" },
];

// Solo lo que no está cubierto ya por otro campo -- "turno cortado" y
// "movilidad propia" ya viven en JOB_PERKS, "fines de semana" ya es un
// valor de AVAILABILITY (shift), y experiencia previa ya la cubre
// experience_required. Repetirlos acá sería el mismo dato dos veces.
export const HARD_REQUIREMENTS: Option[] = [
  { value: "vive_cerca", label: "Vive cerca de la zona" },
  { value: "disponibilidad_inmediata", label: "Disponibilidad inmediata" },
  { value: "mayor_18", label: "Mayor de 18 años" },
];

export const REPORT_REASONS: Option[] = [
  { value: "parece_falso", label: "Parece falso o el negocio no existe" },
  { value: "pide_dinero_o_datos", label: "Pide dinero o datos sospechosos" },
  { value: "discriminatorio_u_ofensivo", label: "Contenido discriminatorio u ofensivo" },
  { value: "otro", label: "Otro" },
];

export const PROFILE_REPORT_REASONS: Option[] = [
  { value: "parece_falso", label: "Parece un perfil falso" },
  { value: "contenido_inapropiado", label: "Contenido inapropiado u ofensivo" },
  { value: "datos_incorrectos", label: "Los datos parecen incorrectos" },
  { value: "otro", label: "Otro" },
];

export const GENDER: Option[] = [
  { value: "hombre", label: "Hombre" },
  { value: "mujer", label: "Mujer" },
  { value: "otro", label: "Otro" },
  { value: "prefiero_no_decir", label: "Prefiero no decirlo" },
];

// Movilidad propia, disponibilidad para empezar ya y sueldo pretendido:
// reemplazan a sexo/edad como criterios reales para elegir candidatos --
// esos sí importan para el puesto, sexo/edad no (ver nota legal en
// candidate-filters.ts).
export const MOBILITY: Option[] = [
  { value: "si", label: "Tengo movilidad propia" },
  { value: "no", label: "No tengo movilidad propia" },
];

export const DURATION_DAYS: Option[] = [
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
];

export const APPLICATION_STATUS: Option[] = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "entrevista", label: "Entrevista" },
  { value: "contratado", label: "Contratado" },
  { value: "descartado", label: "Descartado" },
];

export function labelFor(options: Option[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

export function labelsFor(options: Option[], values: string[]): string[] {
  return values.map((v) => labelFor(options, v));
}

