import {
  type MemberKind,
  MEMBER_ROLE_LABEL,
  formatJoinedDate,
  formatMemberNumber,
  isFounder,
} from "@/lib/member-card";

// Mismos colores que lib/theme/tokens.ts (tema "impacto"), hardcodeados acá
// porque ImageResponse (Satori) no puede leer variables CSS `var(--tucv-*)`
// -- ver el mismo comentario en lib/candidate-share-card.tsx.
const COLORS = {
  bg: "#FBF3E3",
  text: "#151515",
  muted: "#6B6259",
  primary: "#FF4405",
  accent: "#FFC300",
  surface: "#FFFFFF",
};

export const MEMBER_CARD_SIZE = { width: 1080, height: 1350 };

const PANEL = { width: 852, height: 968, offset: 20 };

// Confeti dibujado en la imagen (los papelitos quedan en los márgenes, nunca
// encima del panel). Posiciones deterministas a propósito: la ruta cachea el
// PNG, así que dos requests del mismo miembro tienen que dar exactamente el
// mismo byte -- por eso un LCG con semilla fija y no Math.random().
function confettiPieces(seed: number) {
  let state = seed;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
  const colors = [COLORS.primary, COLORS.accent, COLORS.text, COLORS.surface];
  const { width, height } = MEMBER_CARD_SIZE;
  const bandX = (width - PANEL.width) / 2;
  const bandY = (height - PANEL.height) / 2;

  return Array.from({ length: 54 }, (_, i) => {
    const onSide = i % 3 !== 2;
    const x = onSide
      ? (i % 2 === 0 ? rnd() * bandX : width - bandX + rnd() * bandX)
      : rnd() * width;
    const y = onSide ? rnd() * height : (i % 6 === 2 ? rnd() * bandY : height - bandY + rnd() * bandY);
    const w = 14 + rnd() * 20;
    return {
      key: i,
      left: Math.round(x - w / 2),
      top: Math.round(y),
      width: Math.round(w),
      height: Math.round(w * (0.4 + rnd() * 0.9)),
      rotate: Math.round(rnd() * 180 - 90),
      color: colors[i % colors.length],
    };
  });
}

function TuCVMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        backgroundColor: COLORS.primary,
        border: `${Math.round(size * 0.07)}px solid ${COLORS.text}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: size * 0.46,
          height: size * 0.6,
          borderRadius: size * 0.09,
          backgroundColor: COLORS.bg,
          border: `${Math.max(2, Math.round(size * 0.045))}px solid ${COLORS.text}`,
          transform: "rotate(-8deg)",
          display: "flex",
        }}
      />
    </div>
  );
}

// El número es lo único que importa en esta tarjeta, así que ocupa lo que
// pueda: se achica sólo cuando crece la cantidad de dígitos.
function numberFontSize(digits: number): number {
  if (digits <= 2) return 320;
  if (digits === 3) return 268;
  if (digits === 4) return 214;
  return 168;
}

export function MemberShareCard({
  kind,
  number,
  joinedAt,
}: {
  kind: MemberKind;
  number: number;
  joinedAt: string;
}) {
  const pretty = formatMemberNumber(number);
  const date = formatJoinedDate(joinedAt);
  const founder = isFounder(number);
  const role = MEMBER_ROLE_LABEL[kind].toUpperCase();
  const joinedLine = kind === "candidate" ? `Me sumé el ${date}` : `Nos sumamos el ${date}`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: COLORS.bg,
        fontFamily: "sans-serif",
      }}
    >
      {confettiPieces(20260807).map((p) => (
        <div
          key={p.key}
          style={{
            position: "absolute",
            left: p.left,
            top: p.top,
            width: p.width,
            height: p.height,
            backgroundColor: p.color,
            border: `2px solid ${COLORS.text}`,
            transform: `rotate(${p.rotate}deg)`,
            display: "flex",
          }}
        />
      ))}

      {/* Sombra dura del tema "impacto": un rectángulo negro corrido, no un
          box-shadow -- Satori no garantiza el shadow y acá el offset es parte
          de la identidad, no un adorno. */}
      <div
        style={{
          position: "absolute",
          left: (MEMBER_CARD_SIZE.width - PANEL.width) / 2 + PANEL.offset,
          top: (MEMBER_CARD_SIZE.height - PANEL.height) / 2 + PANEL.offset,
          width: PANEL.width,
          height: PANEL.height,
          backgroundColor: COLORS.text,
          display: "flex",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: (MEMBER_CARD_SIZE.width - PANEL.width) / 2,
          top: (MEMBER_CARD_SIZE.height - PANEL.height) / 2,
          width: PANEL.width,
          height: PANEL.height,
          backgroundColor: COLORS.surface,
          border: `6px solid ${COLORS.text}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: 8,
            color: COLORS.muted,
          }}
        >
          {role} N.º
        </div>

        <div
          style={{
            display: "flex",
            fontSize: numberFontSize(pretty.replace(/\D/g, "").length),
            fontWeight: 800,
            color: COLORS.text,
            lineHeight: 1,
            marginTop: 8,
          }}
        >
          {pretty}
        </div>

        {founder && (
          <div
            style={{
              display: "flex",
              marginTop: 28,
              padding: "14px 32px",
              backgroundColor: COLORS.primary,
              color: COLORS.surface,
              border: `5px solid ${COLORS.text}`,
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: 3,
              transform: "rotate(-2deg)",
            }}
          >
            MIEMBRO FUNDADOR
          </div>
        )}

        <div
          style={{
            display: "flex",
            width: 420,
            height: 5,
            backgroundColor: COLORS.text,
            marginTop: 44,
          }}
        />

        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 38,
            fontWeight: 700,
            color: COLORS.text,
          }}
        >
          {joinedLine}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 52 }}>
          <TuCVMark size={64} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 40, fontWeight: 800, color: COLORS.text }}>
              tucv.ar
            </div>
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: COLORS.muted }}>
              Trabajo cerca tuyo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
