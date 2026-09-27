// Animaciones del operador: ciclo de caminata y globo de pensamiento al acercarse a un invernadero.

import type { Estado } from '../logica';
import type { Jugador } from './colision';
import { caminoRR } from './dibujo';

// pensamientos del operador según el estado del sistema
// (la sirena suena en ADV_TERMICA y en CRITICO: Y_A = A)
export const FRASES: Record<Estado, string[]> = {
  NORMAL: ['Todo tranquilo por aquí 🌱', 'Las plantas se ven felices', 'Nada que reportar, por ahora'],
  ADV_HIDRICA: ['La tierra se está secando...', 'Mejor activo el riego', 'Hay que vigilar la humedad'],
  ADV_TERMICA: ['Está subiendo mucho la temperatura', 'Ventiladores y alarma encendidos', 'El suelo está bien, el aire no'],
  CRITICO: ['¡Esto es crítico!', '¡Necesita agua YA!', '¡Alarma sonando sin parar!'],
};

// elige la frase actual, rotando cada ~2 segundos (130 frames)
export function fraseActual(estado: Estado, frame: number): string {
  const frases = FRASES[estado];
  return frases[Math.floor(frame / 130) % frases.length];
}

// operador con animación de caminata
export function dibujarJugador(ctx: CanvasRenderingContext2D, jugador: Jugador, frame: number) {
  const px = jugador.x;
  const py = jugador.y;
  const mov = jugador.moviendo;
  const f = jugador.fase;
  const sw = mov ? Math.sin(f) : 0; // balanceo de brazos/piernas
  const bob = mov ? Math.abs(Math.sin(f)) * 1.8 : Math.sin(frame * 0.05) * 0.6;

  const footY = py;
  const hipY = py - 13;
  const shoulderY = py - 26 - bob * 0.5;
  const headY = py - 36 - bob * 0.6;

  const PIEL = '#f0c8a4';
  const PIEL_S = '#d9ae86';
  const PELO = '#553824';
  const CAMISA = '#3f7d5a';
  const CAMISA_S = '#2f5f45';
  const PANT = '#3b4a63';
  const BOTA = '#4a3320';
  const PAJA = '#dcb75f';
  const PAJA_S = '#b88f42';

  // sombra
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(px, footY, 12, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // dibuja una extremidad como línea gruesa redondeada
  const capsula = (x1: number, y1: number, x2: number, y2: number, w: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  if (jugador.dir === 'izq' || jugador.dir === 'der') {
    const fl = jugador.dir === 'izq' ? -1 : 1;
    capsula(px - 2 * fl, hipY, px - 3 * fl - sw * 5 * fl, footY, 6, PANT); // pierna trasera
    capsula(px, shoulderY + 2, px - 2 * fl - sw * 6 * fl, shoulderY + 13, 5, CAMISA_S); // brazo trasero
    ctx.fillStyle = CAMISA; // torso
    caminoRR(ctx, px - 7, shoulderY, 14, hipY - shoulderY + 3, 5);
    ctx.fill();
    capsula(px + 2 * fl, hipY, px + 3 * fl + sw * 5 * fl, footY, 6, PANT); // pierna delantera
    ctx.fillStyle = BOTA;
    ctx.beginPath();
    ctx.ellipse(px + 3 * fl + sw * 5 * fl + fl, footY, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    capsula(px, shoulderY + 2, px + 3 * fl + sw * 6 * fl, shoulderY + 13, 5, CAMISA); // brazo delantero
    ctx.fillStyle = PIEL;
    ctx.beginPath();
    ctx.arc(px + 3 * fl + sw * 6 * fl, shoulderY + 14, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PIEL; // cabeza
    ctx.beginPath();
    ctx.arc(px + fl, headY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PELO;
    ctx.beginPath();
    ctx.arc(px + fl, headY - 2, 7, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    ctx.fillStyle = '#2b2b2b'; // ojo
    ctx.beginPath();
    ctx.arc(px + 4 * fl, headY - 1, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PIEL_S; // nariz
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 6 * fl, headY);
    ctx.lineTo(px + 7.5 * fl, headY + 1.5);
    ctx.stroke();
    ctx.fillStyle = PAJA; // sombrero
    ctx.beginPath();
    ctx.ellipse(px + fl, headY - 4, 11, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAJA_S;
    ctx.beginPath();
    ctx.ellipse(px + fl, headY - 5, 6, 4.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  } else {
    const atras = jugador.dir === 'arriba';
    capsula(px - 4, hipY, px - 4 + sw * 4, footY, 6, PANT); // piernas
    capsula(px + 4, hipY, px + 4 - sw * 4, footY, 6, PANT);
    ctx.fillStyle = BOTA;
    ctx.beginPath();
    ctx.ellipse(px - 4 + sw * 4, footY, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + 4 - sw * 4, footY, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = CAMISA; // torso
    caminoRR(ctx, px - 9, shoulderY, 18, hipY - shoulderY + 3, 5);
    ctx.fill();
    ctx.fillStyle = CAMISA_S;
    caminoRR(ctx, px + 3, shoulderY, 6, hipY - shoulderY + 3, 3);
    ctx.fill();
    capsula(px - 9, shoulderY + 1, px - 10 - sw * 4, shoulderY + 13, 5, CAMISA); // brazos
    capsula(px + 9, shoulderY + 1, px + 10 + sw * 4, shoulderY + 13, 5, CAMISA);
    ctx.fillStyle = PIEL;
    ctx.beginPath();
    ctx.arc(px - 10 - sw * 4, shoulderY + 14, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px + 10 + sw * 4, shoulderY + 14, 2.4, 0, Math.PI * 2);
    ctx.fill();
    if (atras) {
      ctx.fillStyle = '#8a6b47'; // mochila
      caminoRR(ctx, px - 7, shoulderY + 2, 14, 12, 3);
      ctx.fill();
    }
    ctx.fillStyle = PIEL; // cabeza
    ctx.beginPath();
    ctx.arc(px, headY, 7, 0, Math.PI * 2);
    ctx.fill();
    if (atras) {
      ctx.fillStyle = PELO;
      ctx.beginPath();
      ctx.arc(px, headY, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PELO;
      ctx.beginPath();
      ctx.arc(px, headY - 2, 7, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2b2b'; // ojos
      ctx.beginPath();
      ctx.arc(px - 2.6, headY, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + 2.6, headY, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PIEL_S; // sonrisa
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, headY + 2, 2, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.fillStyle = PAJA; // sombrero de paja
    ctx.beginPath();
    ctx.ellipse(px, headY - 4, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAJA_S;
    ctx.beginPath();
    ctx.ellipse(px, headY - 6, 6.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// globo de pensamiento sobre el operador
export function dibujarPensamiento(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  px: number,
  py: number,
  texto: string,
) {
  ctx.font = '12px system-ui, sans-serif';
  const pad = 12;
  const w = Math.min(230, Math.max(90, ctx.measureText(texto).width + pad * 2));
  const h = 34;
  let bx = px - w / 2;
  const by = py - 78;
  bx = Math.min(Math.max(bx, 6), canvasWidth - w - 6);

  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  ctx.strokeStyle = 'rgba(60,70,80,0.55)';
  ctx.lineWidth = 1.5;
  caminoRR(ctx, bx, by, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  // colita de circulitos hacia la cabeza del operador
  const burbujas: [number, number, number][] = [
    [px - 5, by + h + 4, 5],
    [px - 10, by + h + 13, 3],
  ];
  for (const [cx, cy, r] of burbujas) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#20303a';
  ctx.textAlign = 'center';
  ctx.fillText(texto, bx + w / 2, by + h / 2 + 4);
  ctx.textAlign = 'left';
}
