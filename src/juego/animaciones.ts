// Animaciones del operador: ciclo de caminata y globo de pensamiento al acercarse a un invernadero.

import type { Estado } from '../logica';
import type { Jugador } from './colision';
import { caminoRR } from './dibujo';

import mcHdUrl from '../assets/MC_HD.png';

// pensamientos del operador según el estado del sistema
// (la alarma solo suena en CRITICO: no mencionarla en los demás estados)
export const FRASES: Record<Estado, string[]> = {
  NORMAL: ['Todo tranquilo por aquí 🌱', 'Las plantas se ven felices', 'Nada que reportar, por ahora'],
  ADV_HIDRICA: ['La tierra se está secando...', 'Mejor activo el riego', 'Hay que vigilar la humedad'],
  ADV_TERMICA: ['Está subiendo mucho la temperatura', 'Enciendo los ventiladores', 'El suelo está bien, el aire no'],
  CRITICO: ['¡Esto es crítico!', '¡Necesita agua YA!', '¡Alarma activada!'],
};

// elige la frase actual, rotando cada ~2 segundos (130 frames)
export function fraseActual(estado: Estado, frame: number): string {
  const frases = FRASES[estado];
  return frases[Math.floor(frame / 130) % frases.length];
}

// CONFIGURACIONES PERSONAJE
const FILA_ABAJO = 0;
const FILA_IZQUIERDA = 1;
const FILA_DERECHA = 2;
const FILA_ARRIBA = 3;

const POSICION_Y_SPRITE: Record<number, number> = {
  [FILA_ABAJO]: -50,
  [FILA_IZQUIERDA]: 600,
  [FILA_DERECHA]: 1220,
  [FILA_ARRIBA]: 1850,
};

const SECUENCIA_CAMINATA = [0, 1, 2, 1];

let spriteCargado = false;
let frameAncho = 420;
let frameAlto = 560;

const spriteJugador = new Image();
spriteJugador.src = mcHdUrl;
spriteJugador.onload = () => {
  spriteCargado = true;
  frameAncho = spriteJugador.width / 3;
  frameAlto = spriteJugador.height / 4;
};

export function dibujarJugador(ctx: CanvasRenderingContext2D, jugador: Jugador, frame: number) {
  const px = jugador.x;
  const py = jugador.y;

  // Sombra proyectada en los pies
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(px, py, 12, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (spriteCargado) {
    // Mapeo de dirección a fila del sprite
    let dirFila = FILA_ABAJO;
    if (jugador.dir === 'arriba') dirFila = FILA_ARRIBA;
    else if (jugador.dir === 'abajo') dirFila = FILA_ABAJO;
    else if (jugador.dir === 'izq') dirFila = FILA_IZQUIERDA;
    else if (jugador.dir === 'der') dirFila = FILA_DERECHA;

    // Aumentamos la velocidad del intercambio de fotogramas si corre (cada 4 frames en lugar de 8)
    const velocidadAnim = jugador.esSprinting ? 4 : 8;
    const indiceAnimacion = jugador.moviendo
      ? Math.floor(frame / velocidadAnim) % SECUENCIA_CAMINATA.length
      : 1; // Cuadro estático de pie

    const columnaActual = SECUENCIA_CAMINATA[indiceAnimacion];
    const sx = columnaActual * frameAncho;
    const sy = POSICION_Y_SPRITE[dirFila];

    // Escala y renderizado
    const tamano = 35;
    const proporcion = frameAlto / frameAncho;
    const anchoSprite = tamano * 1.25;
    const altoSprite = anchoSprite * proporcion;
    const spriteX = px - anchoSprite / 2;
    const spriteY = py - altoSprite + 4; // Apoya los pies sobre la sombra

    ctx.drawImage(
      spriteJugador,
      sx,
      sy,
      frameAncho,
      frameAlto,
      spriteX,
      spriteY,
      anchoSprite,
      altoSprite,
    );
  } else {
    // Fallback visible si la imagen aún no ha cargado
    ctx.fillStyle = '#ff9800';
    ctx.fillRect(px - 10, py - 30, 20, 30);
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
  const w = Math.min(240, Math.max(100, ctx.measureText(texto).width + pad * 2));
  const h = 34;

  // Eleva el globo por encima del personaje (~90px arriba para no taparlo)
  const by = py - 90;
  let bx = px - w / 2;
  bx = Math.min(Math.max(bx, 6), canvasWidth - w - 6);

  // Cuerpo principal del globo
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.strokeStyle = 'rgba(60,70,80,0.55)';
  ctx.lineWidth = 1.5;
  caminoRR(ctx, bx, by, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  // Burbujas desde la cabeza hasta el globo
  const burbujas: [number, number, number][] = [
    [px, py - 46, 3],
    [px, py - 52, 4.5],
  ];

  for (const [cx, cy, r] of burbujas) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
    ctx.stroke();
  }

  // Texto centrado dentro del globo
  ctx.fillStyle = '#20303a';
  ctx.textAlign = 'center';
  ctx.fillText(texto, bx + w / 2, by + h / 2 + 4);
  ctx.textAlign = 'left';
}