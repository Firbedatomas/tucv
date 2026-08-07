"use client";

import { useEffect, useRef } from "react";

// Papelitos con los colores del tema "impacto" (lib/theme/tokens.ts). Son
// rectángulos planos con borde negro, no círculos ni degradés: el mismo
// lenguaje visual que las tarjetas y los botones del resto del sitio.
const COLORS = ["#FF4405", "#FFC300", "#151515", "#FFFFFF"];

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  ratio: number;
  rot: number;
  vrot: number;
  tilt: number;
  vtilt: number;
  color: string;
};

const GRAVITY = 0.32;
const DRAG = 0.992;

// Cañones a los costados: uno abajo a la izquierda disparando hacia adentro y
// arriba, otro espejado a la derecha. Nada cae desde arriba -- el pedido era
// confeti "de los costados", que además deja libre el centro de la pantalla,
// que es justo donde está la tarjeta.
function launch(pieces: Piece[], width: number, height: number, count: number) {
  for (let side = 0; side < 2; side++) {
    const fromLeft = side === 0;
    const originX = fromLeft ? -10 : width + 10;
    const originY = height * 0.82;
    for (let i = 0; i < count; i++) {
      // Abanico de ~55° apuntando hacia adentro y hacia arriba.
      const spread = (Math.random() - 0.5) * 0.95;
      const angle = (fromLeft ? -0.62 : Math.PI + 0.62) + spread * (fromLeft ? 1 : -1);
      const speed = 15 + Math.random() * 17;
      const size = 7 + Math.random() * 9;
      pieces.push({
        x: originX,
        y: originY + (Math.random() - 0.5) * 90,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        ratio: 0.45 + Math.random() * 0.9,
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.34,
        tilt: Math.random() * Math.PI * 2,
        vtilt: 0.06 + Math.random() * 0.12,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }
  }
}

/**
 * Confeti a pantalla completa, disparado desde los dos costados. Se dibuja en
 * un canvas fijo sin captura de puntero, así que nunca tapa ni bloquea los
 * botones del diálogo que festeja.
 *
 * `trigger` reinicia la tanda cuando cambia de valor (ej. al apretar "otra
 * vez"). Con `prefers-reduced-motion` no dibuja nada.
 */
export function Confetti({ trigger = 0 }: { trigger?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const pieces: Piece[] = [];
    // Tres tandas escalonadas: la fiesta dura unos segundos en vez de ser un
    // único golpe que se apaga enseguida.
    launch(pieces, width, height, 60);
    const timers = [
      window.setTimeout(() => launch(pieces, width, height, 45), 550),
      window.setTimeout(() => launch(pieces, width, height, 35), 1400),
    ];

    let raf = 0;
    function frame() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i];
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.tilt += p.vtilt;

        if (p.y - p.size > height || p.x < -120 || p.x > width + 120) {
          pieces.splice(i, 1);
          continue;
        }

        const w = p.size;
        const h = p.size * p.ratio;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // El aleteo: el papel gira sobre su eje y por momentos se ve de canto.
        ctx.scale(Math.cos(p.tilt), 1);
        ctx.fillStyle = p.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#151515";
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
      if (pieces.length > 0) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((t) => clearTimeout(t));
      window.removeEventListener("resize", resize);
    };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 70 }}
    />
  );
}
