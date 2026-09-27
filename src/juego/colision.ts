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
  esSprinting: boolean;
};

export function crearJugador(): Jugador {
  return {
    x: 0,
    y: 0,
    listo: false,
    dir: 'abajo',
    fase: 0,
    moviendo: false,
    esSprinting: false,
  };
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
    // El ancho total visual es W = 130 (de g.x - 65 a g.x + 65).
    // Extendemos la colisión horizontal para proteger los laterales y las esquinas del marco.
    const left = g.x - 65 - 17.5;   // Pared izquierda exterior
    const right = g.x + 65 + 17.5;  // Pared derecha exterior
    const top = g.y - 35;        // Límite trasero
    const bottom = g.y + 46 + 4; // Límite frontal / base inferior

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
  jugador.esSprinting = teclas.has('shift');
  // Factor de velocidad base (1.8 para caminar, 3.6 para correr con Shift)
  const velocidadActual = jugador.esSprinting ? 3.6 : 1.8;

  let deltaX = 0;
  let deltaY = 0;

  if (teclas.has('arrowup') || teclas.has('w')) deltaY -= velocidadActual;
  if (teclas.has('arrowdown') || teclas.has('s')) deltaY += velocidadActual;
  if (teclas.has('arrowleft') || teclas.has('a')) deltaX -= velocidadActual;
  if (teclas.has('arrowright') || teclas.has('d')) deltaX += velocidadActual;

  if (deltaX !== 0 && deltaY !== 0) {
    deltaX *= 0.7071; // Mantiene velocidad constante en diagonal
    deltaY *= 0.7071;
  }

  jugador.moviendo = deltaX !== 0 || deltaY !== 0;

  if (jugador.moviendo) {
    jugador.fase += jugador.esSprinting ? 0.45 : 0.22;

    if (Math.abs(deltaX) >= Math.abs(deltaY)) jugador.dir = deltaX < 0 ? 'izq' : 'der';
    else jugador.dir = deltaY < 0 ? 'arriba' : 'abajo';
  }

  // --- RESOLUCIÓN PIXEL POR PIXEL EN EJE X ---
  const pasoX = Math.sign(deltaX);
  const totalPasosX = Math.abs(deltaX);
  for (let i = 0; i < totalPasosX; i += 1) {
    const distanciaRestante = Math.min(1, totalPasosX - i);
    const probandoX = Math.max(20, Math.min(width - 20, jugador.x + pasoX * distanciaRestante));
    if (!esSolido(probandoX, jugador.y, width, height, invernaderos)) {
      jugador.x = probandoX;
    } else {
      break; // Chocó con la pared en X, se detiene exactamente en el borde
    }
  }

  // --- RESOLUCIÓN PIXEL POR PIXEL EN EJE Y ---
  const pasoY = Math.sign(deltaY);
  const totalPasosY = Math.abs(deltaY);
  for (let i = 0; i < totalPasosY; i += 1) {
    const distanciaRestante = Math.min(1, totalPasosY - i);
    const probandoY = Math.max(40, Math.min(height - 12, jugador.y + pasoY * distanciaRestante));
    if (!esSolido(jugador.x, probandoY, width, height, invernaderos)) {
      jugador.y = probandoY;
    } else {
      break; // Chocó con la pared en Y, se detiene exactamente en el borde
    }
  }
}