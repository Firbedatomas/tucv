// Constantes compartidas del sistema de referencias/recomendaciones (relación
// del referente con el candidato). Mismos valores que el select de PocketBase.
export const RELATION_OPTIONS = [
  { value: "ex_jefe", label: "Ex jefe/a" },
  { value: "encargado", label: "Encargado/a" },
  { value: "companiero", label: "Compañero/a de trabajo" },
  { value: "cliente", label: "Cliente" },
  { value: "empresa", label: "Empresa" },
  { value: "conocido", label: "Conocido/a" },
] as const;

export type RelationValue = (typeof RELATION_OPTIONS)[number]["value"];

export function relationLabel(value: string): string {
  return RELATION_OPTIONS.find((r) => r.value === value)?.label ?? value;
}

export const REFERENCE_STATUSES = ["pending", "approved", "hidden", "rejected"] as const;
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number];
