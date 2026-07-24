// Orden de la cola de captación (/admin/captacion).
//
// El contacto es manual, así que lo único que importa es qué negocio aparece
// primero en la lista. Al 2026-07-24 había 986 sembrados, 11 con candidatos
// interesados y 0 contactados: la lista venía sin ordenar, así que los 11
// leads calientes estaban enterrados entre cientos de filas iguales.
//
// Un candidato que marcó "me interesa" en un negocio que ni siquiera está en
// TuCV es el lead más caliente que existe acá -- y se enfría solo.

export type ConPrioridad = {
  interestCount: number;
  status: string;
  contactEmail?: string;
  contactPhone?: string;
};

/**
 * Ordena: primero los que tienen interés real y todavía no se contactaron,
 * después el resto por cantidad de interés, y al final los descartados.
 *
 * Dentro del mismo nivel de interés, adelante los que tienen forma de
 * contacto: sin teléfono ni email no hay nada que hacer con esa fila.
 */
export function ordenarPorPrioridad<T extends ConPrioridad>(filas: readonly T[]): T[] {
  const rango = (f: T): number => {
    if (f.status === "opted_out") return 3;
    if (f.status === "claimed") return 2;
    if (f.interestCount > 0 && f.status === "detected") return 0;
    return 1;
  };
  const contactable = (f: T): number => (f.contactPhone || f.contactEmail ? 0 : 1);

  return [...filas].sort(
    (a, b) =>
      rango(a) - rango(b) ||
      b.interestCount - a.interestCount ||
      contactable(a) - contactable(b),
  );
}
