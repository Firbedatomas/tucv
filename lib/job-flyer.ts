"use client";

// Mismos colores que lib/theme/tokens.ts (tema "impacto") -- un <canvas> no
// puede leer variables CSS, van hardcodeados acá igual que en app/icon.svg
// y app/opengraph-image.tsx.
const COLORS = {
  bg: "#FBF3E3",
  primary: "#FF4405",
  primaryText: "#FFFFFF",
  text: "#151515",
  muted: "#6B6259",
  accent: "#FFC300",
  surface: "#FFFFFF",
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Dibuja la imagen tipo "contain" (mantiene proporción, nunca la deforma)
// centrada en el cuadro dado -- el logo puede venir en cualquier relación de
// aspecto (cuadrado, apaisado, vertical).
function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  boxX: number,
  boxY: number,
  boxSize: number,
) {
  const ratio = Math.min(boxSize / img.width, boxSize / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, boxX + (boxSize - w) / 2, boxY + (boxSize - h) / 2, w, h);
}

// Envuelve texto largo (nombre de negocio o puesto) en varias líneas para
// que no se salga del cartel -- sin esto un nombre largo de negocio se
// corta o se sale del canvas.
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Cartel A4-ish para imprimir y pegar en el local -- el QR es el elemento
// principal (más grande), con el puesto y el negocio como "personalización"
// arriba. Se puede volver a descargar las veces que quiera, no queda nada
// guardado server-side (todo pasa en el navegador de quien lo pide).
export async function generateJobFlyerDataUrl({
  role,
  businessName,
  qrDataUrl,
  logoUrl,
}: {
  role: string;
  businessName: string;
  qrDataUrl: string;
  logoUrl?: string | null;
}): Promise<string> {
  // W/H son el espacio de coordenadas "de diseño" -- todo el dibujo de acá
  // abajo sigue escrito en esa escala sin cambios. La resolución real del
  // canvas se multiplica por PRINT_SCALE para que, impreso en A4 (mismo
  // ratio 1:1.414), salga nítido y no pixelado -- 1000x1414 a secas
  // imprimía borroso en tamaño real. ~300dpi para una hoja A4.
  const W = 1000;
  const H = 1414;
  const PRINT_SCALE = 2.48;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * PRINT_SCALE);
  canvas.height = Math.round(H * PRINT_SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no se pudo crear el canvas");
  ctx.scale(PRINT_SCALE, PRINT_SCALE);

  // Fondo
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = COLORS.text;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  // Header naranja
  const headerH = 260;
  ctx.fillStyle = COLORS.primary;
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = COLORS.text;
  ctx.fillRect(0, headerH - 8, W, 8);

  ctx.fillStyle = COLORS.primaryText;
  ctx.textAlign = "center";
  ctx.font = "900 76px sans-serif";
  ctx.fillText("SE BUSCA", W / 2, 110);
  ctx.fillText("PERSONAL", W / 2, 195);

  // Puesto (personalización principal)
  let y = headerH + 90;
  ctx.fillStyle = COLORS.text;
  ctx.font = "800 64px sans-serif";
  const roleLines = wrapText(ctx, role || "Se busca personal", W - 120);
  for (const line of roleLines.slice(0, 2)) {
    ctx.fillText(line, W / 2, y);
    y += 74;
  }

  // Logo del negocio (opcional) -- arriba del nombre, no en vez de él: la
  // idea es reforzar la marca, no reemplazar el texto por las dudas de que
  // el logo no se lea bien en una impresión chica/blanco y negro.
  if (logoUrl) {
    try {
      const logoImg = await loadImage(logoUrl);
      const logoBox = 130;
      const logoX = (W - logoBox) / 2;
      const logoY = y;
      ctx.fillStyle = COLORS.surface;
      ctx.strokeStyle = COLORS.text;
      ctx.lineWidth = 4;
      ctx.fillRect(logoX, logoY, logoBox, logoBox);
      ctx.strokeRect(logoX, logoY, logoBox, logoBox);
      drawContainedImage(ctx, logoImg, logoX + 8, logoY + 8, logoBox - 16);
      y += logoBox + 24;
    } catch {
      // Si el logo no carga (red, CORS, etc.) seguimos sin él -- no vale la
      // pena que falle el cartel entero por esto, el nombre de texto ya
      // identifica al negocio igual.
    }
  }

  // Negocio
  if (businessName) {
    y += 10;
    ctx.fillStyle = COLORS.muted;
    ctx.font = "600 38px sans-serif";
    const bizLines = wrapText(ctx, businessName, W - 160);
    for (const line of bizLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, y);
      y += 46;
    }
  }

  // QR -- el elemento más grande, centrado
  const qrImg = await loadImage(qrDataUrl);
  const qrSize = 620;
  const qrX = (W - qrSize) / 2;
  const qrY = y + 40;
  const qrPad = 24;
  ctx.fillStyle = COLORS.surface;
  ctx.fillRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);
  ctx.strokeStyle = COLORS.text;
  ctx.lineWidth = 6;
  ctx.strokeRect(qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Call to action bajo el QR
  const ctaY = qrY + qrSize + qrPad + 70;
  ctx.fillStyle = COLORS.text;
  ctx.font = "800 44px sans-serif";
  ctx.fillText("Escaneá y dejá tu perfil", W / 2, ctaY);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 32px sans-serif";
  ctx.fillText("Con la cámara de tu celular", W / 2, ctaY + 48);

  // Footer TuCV
  const footerH = 110;
  ctx.fillStyle = COLORS.text;
  ctx.fillRect(0, H - footerH, W, footerH);
  ctx.fillStyle = COLORS.bg;
  ctx.font = "900 46px sans-serif";
  ctx.fillText("TuCV", W / 2, H - footerH / 2 + 16);

  return canvas.toDataURL("image/png");
}
