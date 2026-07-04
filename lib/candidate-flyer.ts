"use client";

// Mismo patrón que lib/job-flyer.ts (generateJobFlyerDataUrl) -- cartel
// A4-ish para imprimir, mismo layout/escala/colores, pero para un postulante
// en vez de una búsqueda ("BUSCO LABURO" en vez de "SE BUSCA PERSONAL").
const COLORS = {
  bg: "#FBF3E3",
  primary: "#FF4405",
  primaryText: "#FFFFFF",
  text: "#151515",
  muted: "#6B6259",
  surface: "#FFFFFF",
};

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

export async function generateCandidateFlyerDataUrl({
  displayName,
  category,
  cityZone,
  qrDataUrl,
}: {
  displayName: string;
  category: string;
  cityZone: string;
  qrDataUrl: string;
}): Promise<string> {
  const W = 1000;
  const H = 1414;
  const PRINT_SCALE = 2.48;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * PRINT_SCALE);
  canvas.height = Math.round(H * PRINT_SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no se pudo crear el canvas");
  ctx.scale(PRINT_SCALE, PRINT_SCALE);

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = COLORS.text;
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, W - 10, H - 10);

  const headerH = 260;
  ctx.fillStyle = COLORS.primary;
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = COLORS.text;
  ctx.fillRect(0, headerH - 8, W, 8);

  ctx.fillStyle = COLORS.primaryText;
  ctx.textAlign = "center";
  ctx.font = "900 76px sans-serif";
  ctx.fillText("BUSCO", W / 2, 110);
  ctx.fillText("LABURO", W / 2, 195);

  let y = headerH + 90;
  ctx.fillStyle = COLORS.text;
  ctx.font = "800 64px sans-serif";
  const nameLines = wrapText(ctx, displayName || "Postulante TuCV", W - 120);
  for (const line of nameLines.slice(0, 2)) {
    ctx.fillText(line, W / 2, y);
    y += 74;
  }

  const subtitle = [category, cityZone].filter(Boolean).join(" · ");
  if (subtitle) {
    y += 10;
    ctx.fillStyle = COLORS.muted;
    ctx.font = "600 38px sans-serif";
    const subLines = wrapText(ctx, subtitle, W - 160);
    for (const line of subLines.slice(0, 2)) {
      ctx.fillText(line, W / 2, y);
      y += 46;
    }
  }

  const qrImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataUrl;
  });
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

  const ctaY = qrY + qrSize + qrPad + 70;
  ctx.fillStyle = COLORS.text;
  ctx.font = "800 44px sans-serif";
  ctx.fillText("Escaneá y mirá mi perfil", W / 2, ctaY);
  ctx.fillStyle = COLORS.muted;
  ctx.font = "500 32px sans-serif";
  ctx.fillText("Con la cámara de tu celular", W / 2, ctaY + 48);

  const footerH = 110;
  ctx.fillStyle = COLORS.text;
  ctx.fillRect(0, H - footerH, W, footerH);
  ctx.fillStyle = COLORS.bg;
  ctx.font = "900 46px sans-serif";
  ctx.fillText("TuCV", W / 2, H - footerH / 2 + 16);

  return canvas.toDataURL("image/png");
}
