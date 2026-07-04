// "Hace 3 días" / "Hace 2 horas" -- PocketBase manda fechas UTC como
// "2026-07-03 03:49:07.460Z" (sin "T"), Date la parsea igual pero solo si
// no se la toca -- no reformatear a mano.
//
// `now` se pasa como parámetro (no Date.now() acá adentro) para que sea
// testeable/determinístico y usable dentro de un workflow, que no permite
// Date.now() en el cuerpo del script.
export function timeAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const MONTH = 30 * DAY;
  const YEAR = 12 * MONTH;

  function unit(count: number, singular: string, plural: string): string {
    const n = Math.floor(count);
    return `Hace ${n} ${n === 1 ? singular : plural}`;
  }

  if (seconds < 30) return "Recién publicada";
  if (seconds < HOUR) return unit(seconds / MINUTE, "minuto", "minutos");
  if (seconds < DAY) return unit(seconds / HOUR, "hora", "horas");
  if (seconds < MONTH) return unit(seconds / DAY, "día", "días");
  if (seconds < YEAR) return unit(seconds / MONTH, "mes", "meses");
  return unit(seconds / YEAR, "año", "años");
}
