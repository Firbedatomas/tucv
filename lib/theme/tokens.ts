import type { CSSProperties } from "react";

export type ThemeTokens = {
  id: string;
  name: string;
  summary: string;
  headline: string;
  subheadline: string;
  colors: {
    bg: string;
    surface: string;
    primary: string;
    primaryText: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
  };
  font: string;
  radius: string;
  shadow: string;
};

export const THEMES: ThemeTokens[] = [
  {
    id: "impacto",
    name: "Impacto",
    summary: "Colores fuertes, bordes sólidos, esquinas rectas y sombra dura. Nada de blanco vacío.",
    headline: "Dejá de recibir CVs por mail.",
    subheadline: "Creá tu perfil o tu búsqueda en minutos.",
    colors: {
      bg: "#FBF3E3",
      surface: "#FFFFFF",
      primary: "#FF4405",
      primaryText: "#FFFFFF",
      text: "#151515",
      muted: "#6B6259",
      border: "#151515",
      accent: "#FFC300",
    },
    font: "'Inter', system-ui, sans-serif",
    radius: "4px",
    // Sombra dura tipo "offset" (sin blur), no la de dos capas suaves del
    // resto de los proyectos del server -- acá es a propósito, pedido
    // explícito del usuario (2026-07-03): quiere un look con carácter,
    // disruptivo, no el default seguro de Refactoring UI.
    shadow: "3px 3px 0 #151515",
  },
  {
    id: "simple-popular",
    name: "Simple Popular",
    summary: "Clásico, cálido y fácil de leer. Sirve para cualquier rubro.",
    headline: "Dejá de recibir CVs por mail.",
    subheadline: "Creá tu perfil o tu búsqueda en minutos.",
    colors: {
      bg: "#F7F7F5",
      surface: "#FFFFFF",
      primary: "#2563EB",
      primaryText: "#FFFFFF",
      text: "#1F2933",
      muted: "#6B7280",
      border: "#E5E7EB",
      accent: "#F59E0B",
    },
    font: "'Inter', system-ui, sans-serif",
    radius: "12px",
    // Sombra en dos capas (Refactoring UI): la primera, grande y suave,
    // simula luz directa; la segunda, chica y más oscura, simula la falta
    // de luz ambiente pegada al elemento.
    shadow: "0 1px 2px hsla(220, 20%, 10%, 0.06), 0 4px 8px hsla(220, 20%, 10%, 0.08)",
  },
  {
    id: "whatsapp-local",
    name: "WhatsApp Local",
    summary: "Tono de chat, verde y cercano. Para búsquedas informales de barrio.",
    headline: "Che, ¿buscás laburo cerca tuyo?",
    subheadline: "Mandá tu perfil como quien manda un mensaje.",
    colors: {
      bg: "#E9F5EC",
      surface: "#FFFFFF",
      primary: "#128C4A",
      primaryText: "#FFFFFF",
      text: "#0B1D14",
      muted: "#4B5A52",
      border: "#CFE8D6",
      accent: "#25D366",
    },
    font: "'Segoe UI', system-ui, sans-serif",
    radius: "18px",
    shadow: "0 1px 2px hsla(150, 10%, 10%, 0.08), 0 4px 10px hsla(150, 60%, 25%, 0.12)",
  },
  {
    id: "tarjeta-cv",
    name: "Tarjeta CV",
    summary: "Prolijo tipo tarjeta profesional, más serio para oficios y comercio.",
    headline: "Tu perfil laboral, en una tarjeta.",
    subheadline: "Cargalo una vez y compartilo donde haga falta.",
    colors: {
      bg: "#F4F3EF",
      surface: "#FFFFFF",
      primary: "#0F2A4A",
      primaryText: "#FFFFFF",
      text: "#14213D",
      muted: "#5B6472",
      border: "#DCD8CD",
      accent: "#C99A3C",
    },
    font: "'Georgia', 'Times New Roman', serif",
    radius: "6px",
    shadow: "0 2px 4px hsla(215, 40%, 10%, 0.10), 0 8px 20px hsla(215, 40%, 10%, 0.12)",
  },
  {
    id: "mercado-local",
    name: "Mercado Local",
    summary: "Cálido, tierra y feria de barrio. Para comercio y trabajos de cercanía.",
    headline: "El laburo está a la vuelta de tu casa.",
    subheadline: "Conectamos vecinos con negocios que necesitan una mano.",
    colors: {
      bg: "#FBF2E7",
      surface: "#FFFDF9",
      primary: "#B4531B",
      primaryText: "#FFFFFF",
      text: "#3B2416",
      muted: "#8A6A50",
      border: "#EBD9C2",
      accent: "#3F7D4F",
    },
    font: "'Verdana', system-ui, sans-serif",
    radius: "14px",
    shadow: "0 1px 3px hsla(20, 30%, 15%, 0.10), 0 6px 14px hsla(20, 60%, 30%, 0.12)",
  },
  {
    id: "institucional-simple",
    name: "Institucional Simple",
    summary: "Sobrio, gris/azul, alta confianza. Para municipios, gremios, PyMEs grandes.",
    headline: "Un registro simple de búsqueda laboral local.",
    subheadline: "Perfiles verificados, sin intermediarios.",
    colors: {
      bg: "#F1F3F5",
      surface: "#FFFFFF",
      primary: "#1E3A5F",
      primaryText: "#FFFFFF",
      text: "#1C2331",
      muted: "#5C6773",
      border: "#D7DCE1",
      accent: "#3F72AF",
    },
    font: "'Arial', system-ui, sans-serif",
    radius: "4px",
    shadow: "0 1px 2px hsla(210, 20%, 10%, 0.06), 0 2px 6px hsla(210, 20%, 10%, 0.06)",
  },
  {
    id: "joven-moderno",
    name: "Joven Moderno",
    summary: "Vibrante, bien redondeado, tono directo. Para captar primer empleo.",
    headline: "Conseguí laburo sin vueltas.",
    subheadline: "Un perfil, un link, y listo.",
    colors: {
      bg: "#F5F1FF",
      surface: "#FFFFFF",
      primary: "#7C3AED",
      primaryText: "#FFFFFF",
      text: "#221639",
      muted: "#6B5B95",
      border: "#E4D9FA",
      accent: "#EC4899",
    },
    font: "'Poppins', system-ui, sans-serif",
    radius: "20px",
    shadow: "0 2px 4px hsla(265, 30%, 15%, 0.10), 0 10px 24px hsla(265, 70%, 45%, 0.16)",
  },
];

export function getTheme(id: string): ThemeTokens {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function themeStyleVars(theme: ThemeTokens): CSSProperties {
  const vars: Record<string, string> = {
    "--tucv-bg": theme.colors.bg,
    "--tucv-surface": theme.colors.surface,
    "--tucv-primary": theme.colors.primary,
    "--tucv-primary-text": theme.colors.primaryText,
    "--tucv-text": theme.colors.text,
    "--tucv-muted": theme.colors.muted,
    "--tucv-border": theme.colors.border,
    "--tucv-accent": theme.colors.accent,
    "--tucv-font": theme.font,
    "--tucv-radius": theme.radius,
    "--tucv-shadow": theme.shadow,
  };
  return vars as CSSProperties;
}
