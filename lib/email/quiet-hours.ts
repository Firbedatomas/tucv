// Horario silencioso (quiet hours) -- lógica pura y testeable, sin acceso a
// PocketBase ni al reloj global (recibe `now` por parámetro).
//
// Argentina usa UTC-3 fijo, sin horario de verano desde 2009 -- por eso
// alcanza con un offset constante en vez de una librería de timezones. Las
// horas guardadas en preferencias (quiet_hours_start/end, 0-23) son hora
// local de Argentina; el server corre en UTC.
const AR_OFFSET_HOURS = 3;

export function currentHourInArgentina(now: Date): number {
  return (now.getUTCHours() - AR_OFFSET_HOURS + 24) % 24;
}

export function isWithinQuietHours(hour: number, start: number | null, end: number | null): boolean {
  if (start === null || end === null || start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // La ventana cruza la medianoche (ej. 20 a 8): activa de `start` a 23 y de
  // 0 a `end`.
  return hour >= start || hour < end;
}

// Próximo instante (UTC) en que la ventana de silencio termina -- cuándo el
// email diferido vuelve a ser enviable. `endHourLocal` es hora de Argentina.
export function nextQuietHoursEndUtc(now: Date, endHourLocal: number): Date {
  const endUtcHour = (endHourLocal + AR_OFFSET_HOURS) % 24;
  const candidate = new Date(now);
  candidate.setUTCMinutes(0, 0, 0);
  candidate.setUTCHours(endUtcHour);
  // Si esa hora ya pasó hoy (o es ahora mismo), la ventana termina mañana.
  if (candidate.getTime() <= now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() + 1);
  }
  return candidate;
}
