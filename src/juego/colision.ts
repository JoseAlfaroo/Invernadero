// Movimiento del operador y colisión con los sólidos del mapa (invernaderos, pozo, laguna).

export type Invernadero = { x: number; y: number };

export type Direccion = 'arriba' | 'abajo' | 'izq' | 'der';

export type Jugador = {
  x: number;
  y: number;
  listo: boolean;
  dir: Direccion;
  fase: number;
  moviendo: boolean;
};

export function crearJugador(): Jugador {
  return { x: 0, y: 0, listo: false, dir: 'abajo', fase: 0, moviendo: false };
}

/* posición de los 3 invernaderos, en función del tamaño del canvas */
export function posicionesInvernaderos(width: number, height: number): Invernadero[] {
  return [
    { x: width * 0.24, y: height * 0.32 },
    { x: width * 0.62, y: height * 0.24 },
    { x: width * 0.4, y: height * 0.72 },
  ];
}

// Caja sólida de cada invernadero (algo más angosta que el sprite, W=130 H=92).
export function chocaConInvernadero(px: number, py: number, invernaderos: Invernadero[]): boolean {
  for (const g of invernaderos) {
    const left = g.x - 65 + 10;
    const right = g.x + 65 - 10;
    const top = g.y - 46 - 4;
    const bottom = g.y + 46 - 2;
    if (px > left && px < right && py > top && py < bottom) return true;
  }
  return false;
}

/* otros obstáculos sólidos del escenario (pozo y laguna) */
export function chocaConEscenario(px: number, py: number, width: number, height: number): boolean {
  const pozoX = width * 0.6;
  const pozoY = height * 0.56;
  if (Math.hypot(px - pozoX, py - (pozoY - 4)) < 20) return true;
  const lagX = width * 0.13;
  const lagY = height * 0.85;
  const dx = (px - lagX) / 50;
  const dy = (py - lagY) / 28;
  if (dx * dx + dy * dy < 1) return true;
  return false;
}

export function esSolido(px: number, py: number, width: number, height: number, invernaderos: Invernadero[]): boolean {
  return chocaConInvernadero(px, py, invernaderos) || chocaConEscenario(px, py, width, height);
}

const TECLAS_MOV = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];
export function esTeclaDeMovimiento(tecla: string): boolean {
  return TECLAS_MOV.includes(tecla);
}

// Teclas -> nueva posición; colisión resuelta por eje para poder deslizarse pegado a un borde. Muta `jugador`.
export function moverJugador(
  jugador: Jugador,
  teclas: Set<string>,
  width: number,
  height: number,
  invernaderos: Invernadero[],
) {
  const v = 1.8;
  let dx = 0;
  let dy = 0;
  if (teclas.has('arrowup') || teclas.has('w')) dy -= v;
  if (teclas.has('arrowdown') || teclas.has('s')) dy += v;
  if (teclas.has('arrowleft') || teclas.has('a')) dx -= v;
  if (teclas.has('arrowright') || teclas.has('d')) dx += v;
  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071; // diagonal a la misma velocidad
    dy *= 0.7071;
  }

  jugador.moviendo = dx !== 0 || dy !== 0;
  if (jugador.moviendo) {
    jugador.fase += 0.28; // avanza el ciclo de caminata
    if (Math.abs(dx) >= Math.abs(dy)) jugador.dir = dx < 0 ? 'izq' : 'der';
    else jugador.dir = dy < 0 ? 'arriba' : 'abajo';
  }

  const nx = Math.max(20, Math.min(width - 20, jugador.x + dx));
  const ny = Math.max(40, Math.min(height - 12, jugador.y + dy));
  if (!esSolido(nx, jugador.y, width, height, invernaderos)) jugador.x = nx;
  if (!esSolido(jugador.x, ny, width, height, invernaderos)) jugador.y = ny;
}
