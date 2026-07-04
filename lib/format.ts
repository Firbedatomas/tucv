// Separador de miles en vivo, formato argentino (punto cada 3 dígitos) +
// signo $ delante de cada monto. No asume un solo número: reformatea CADA
// corrida de dígitos que encuentre, así sirve tanto para un monto suelto
// ("800000" -> "$800.000") como para un rango ("800000 a 900000" ->
// "$800.000 a $900.000"), sin tocar el resto del texto (espacios, guiones,
// letras).
//
// Se llama en cada tecla sobre un valor que YA puede tener "$" y puntos
// puestos por la pasada anterior -- por eso primero los sacamos antes de
// reformatear. Sin sacar los puntos, "8.0000" se lee como dos números
// sueltos ("8" y "0000") en vez de uno solo ("80000"), y el recorte de
// ceros a la izquierda de "0000" se come dígitos del medio del número real
// (reproducido tipeando rápido con Playwright: terminaba en "8.9 a 0" en
// vez de "800.000 a 900.000").
export function formatThousands(value: string): string {
  const withoutDollar = value.replace(/\$/g, "");
  const withoutSeparators = withoutDollar.replace(/(?<=\d)\.(?=\d)/g, "");
  return withoutSeparators.replace(/\d+/g, (digits) => {
    const cleaned = digits.replace(/^0+(?=\d)/, "");
    const grouped = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `$${grouped}`;
  });
}

// Dado el valor crudo tipeado y dónde estaba el cursor, calcula el valor
// formateado y la posición de cursor equivalente. Contamos todo MENOS "$"
// y los puntos (no solo dígitos): si el cursor está después de un espacio
// o una letra (ej. "800.000 a|", cursor tras la "a"), contar solo dígitos
// lo perdía -- solo veía "hay 6 dígitos antes" y lo mandaba justo después
// del último dígito, comiéndose el resto. Como formatear únicamente agrega
// o saca "$" y puntos, "todo menos esos dos" es la unidad que se conserva
// 1 a 1 entre el valor crudo y el formateado.
// Puro (no toca el DOM) a propósito: quien lo use decide cuándo aplicar el
// cursor -- ver components/ui/ThousandsInput.tsx para el porqué.
export function formatThousandsWithCursor(
  rawValue: string,
  rawCursor: number,
): { formatted: string; cursor: number } {
  const countKept = (s: string) => s.replace(/[.$]/g, "").length;
  const keptBeforeCursor = countKept(rawValue.slice(0, rawCursor));
  const formatted = formatThousands(rawValue);

  if (keptBeforeCursor === 0) return { formatted, cursor: 0 };

  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] !== "." && formatted[i] !== "$") seen++;
    if (seen === keptBeforeCursor) return { formatted, cursor: i + 1 };
  }
  return { formatted, cursor: formatted.length };
}
