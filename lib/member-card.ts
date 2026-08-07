export type MemberKind = "candidate" | "business";

export function isMemberKind(value: string | null): value is MemberKind {
  return value === "candidate" || value === "business";
}

export type MemberNumber = {
  kind: MemberKind;
  /** Puesto en la fila: 1 = el primero que se registró. */
  number: number;
  /** Cuántos hay hoy en total (para el "de N" que se muestra al lado). */
  total: number;
  /** `created` del registro, en ISO -- la fecha que sale impresa en la imagen. */
  joinedAt: string;
};

// El tipo y los textos viven acá (y no en lib/member-number.ts) porque ese
// módulo es `server-only`: los componentes del cliente necesitan estas mismas
// etiquetas para pintar la tarjeta animada.
//
// Textos y formato de la tarjeta de miembro, compartidos entre la versión
// animada en HTML (components/celebration/MemberCard.tsx) y el PNG que se
// descarga/comparte (lib/member-share-card.tsx). Si sólo viviera en uno de los
// dos, la imagen descargada diría algo distinto de lo que la persona vio.

export const MEMBER_ROLE_LABEL: Record<MemberKind, string> = {
  candidate: "Postulante",
  business: "Empresa",
};

// Los primeros 1000 de cada lado se llevan el sello de fundador. Es el sello lo
// que hace que la tarjeta valga la pena compartirse temprano, cuando todavía
// hay poco volumen.
export const FOUNDER_LIMIT = 1000;

export function isFounder(number: number): boolean {
  return number <= FOUNDER_LIMIT;
}

export function formatMemberNumber(n: number): string {
  return new Intl.NumberFormat("es-AR").format(n);
}

export function formatJoinedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export function memberShareText(kind: MemberKind, number: number): string {
  const n = formatMemberNumber(number);
  return kind === "candidate"
    ? `Soy el postulante N.º ${n} de TuCV. Armé mi perfil para que me encuentren los negocios de mi zona.`
    : `Somos la empresa N.º ${n} en TuCV. Publicamos nuestras búsquedas y recibimos postulantes de la zona.`;
}

export function memberShareFileName(kind: MemberKind, number: number): string {
  return `tucv-${kind === "candidate" ? "postulante" : "empresa"}-${number}.png`;
}
