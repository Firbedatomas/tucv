// Compartido entre el form de crear búsqueda y donde haga falta mostrar el
// límite del plan -- un solo lugar para la regla real de negocio en vez de
// tener el número de cada plan repetido/hardcodeado en cada componente.
export function activeJobLimit(plan: string): number | null {
  if (plan === "pro") return null; // sin límite
  if (plan === "multi_local") return 10;
  return 1; // free
}

// Pro y Equipo comparten el mismo beneficio real de "cada búsqueda
// nueva arranca destacada sola" -- lo que cambia entre ellos es el límite de
// búsquedas activas, no esto.
export function autoBoostsOnCreate(plan: string): boolean {
  return plan === "pro" || plan === "multi_local";
}

// Free: 1 búsqueda por mes (además del límite de "1 activa a la vez" de
// activeJobLimit -- este es un tope aparte sobre cuántas se pueden CREAR en
// una ventana de 30 días, así que cerrarla antes no libera un cupo nuevo).
export function monthlyJobLimit(plan: string): number | null {
  if (plan === "free") return 1;
  return null;
}

// Free: el link dura 7 días (no los 30 por default) -- es la duración real
// de la búsqueda, no solo una sugerencia; el form ni deja elegir otra cosa
// en ese plan.
export function maxDurationDays(plan: string): number | null {
  if (plan === "free") return 7;
  return null;
}

// Qué chips de la publicación pública se ocultan en el plan gratis --
// beneficios y requisitos son datos "extra" que ayudan a filtrar mejor,
// pero no son imprescindibles para entender ni postularse al puesto (a
// diferencia de zona, turno, sueldo o experiencia). Ocultarlos ahí es un
// incentivo real para pasar a Pro sin romper la búsqueda gratis.
export function hidesExtraChips(plan: string): boolean {
  return plan === "free";
}

// Cuántos miembros de equipo (invitaciones pendientes + membresías activas,
// sumadas) puede tener un negocio -- exclusivo del plan Equipo (antes
// "Multi-sucursal"), ni Gratis ni Pro lo incluyen.
export function maxTeamMembers(plan: string): number {
  return plan === "multi_local" ? 10 : 0;
}
