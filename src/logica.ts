/* =========================================================================
   LÓGICA DEL INVERNADERO INTELIGENTE
   Modelo de Arquitectura de Computadoras:
   ENTRADA  ->  PROCESAMIENTO  ->  MEMORIA  ->  SALIDA
   Todo se maneja con números ENTEROS para que las conversiones
   (decimal / binario / hexadecimal) y las reglas sean fáciles de leer.
   ========================================================================= */

/* ---------- MEMORIA: parámetros constantes (no cambian nunca) ---------- */
export const UMBRAL_HUMEDAD_BAJA = 30; // % mínimo aceptable de humedad
export const UMBRAL_TEMP_CRITICA = 35; // °C máximo aceptable de temperatura

/* ---------- Utilidad interna: dejar el valor como entero 0..255 -------- */
function aByte(numeroEntero: number): number {
  return Math.max(0, Math.min(255, Math.trunc(numeroEntero)));
}

/* ---------- a) Decimal  ->  Binario de 8 bits -------------------------- */
// Ej: 35  ->  "00100011"
export function convertirABinario8Bits(numeroEntero: number): string {
  return aByte(numeroEntero).toString(2).padStart(8, '0');
}

/* ---------- b) Decimal  ->  Hexadecimal de 2 dígitos + "H" ------------- */
// Ej: 35  ->  "23H"
export function convertirAHexadecimal(numeroEntero: number): string {
  return aByte(numeroEntero).toString(16).toUpperCase().padStart(2, '0') + 'H';
}

/* ---------- Tipo con todas las SALIDAS del sistema -------------------- */
export type Salidas = {
  bombaAgua: 0 | 1;
  ventiladores: 0 | 1;
  alarmaSonora: 0 | 1;
  estadoLuzLED: 1 | 2 | 3; // 1 Verde · 2 Amarillo · 3 Rojo
  estado: 'NORMAL' | 'ADVERTENCIA' | 'CRITICO';
  regla: string; // qué regla se activó (para el HUD técnico)
};

export const NOMBRE_LED: Record<1 | 2 | 3, string> = {
  1: 'Verde',
  2: 'Amarillo',
  3: 'Rojo',
};

/* ---------- c) PROCESAMIENTO: evaluar el estado del sistema ----------- */
// Se evalúan las 3 reglas EN ORDEN, de mayor a menor severidad.
// La primera que se cumple "gana" y define todas las salidas.
export function evaluarEstadoSistema(
  humedadSuelo: number,
  temperaturaAmbiente: number,
): Salidas {
  const hum = Math.trunc(humedadSuelo);
  const temp = Math.trunc(temperaturaAmbiente);

  // ---- Regla 1 · CRÍTICO: hace demasiado calor Y la tierra está seca ----
  if (temp > UMBRAL_TEMP_CRITICA && hum < UMBRAL_HUMEDAD_BAJA) {
    return {
      bombaAgua: 1,
      ventiladores: 1,
      alarmaSonora: 1,
      estadoLuzLED: 3,
      estado: 'CRITICO',
      regla: 'Regla 1 · Estado Crítico',
    };
  }

  // ---- Regla 2 · ADVERTENCIA: la tierra se seca, temperatura aún ok ----
  if (hum < UMBRAL_HUMEDAD_BAJA && temp <= UMBRAL_TEMP_CRITICA) {
    return {
      bombaAgua: 1,
      ventiladores: 0,
      alarmaSonora: 0,
      estadoLuzLED: 2,
      estado: 'ADVERTENCIA',
      regla: 'Regla 2 · Advertencia',
    };
  }

  // ---- Regla 3 · NORMAL: humedad correcta -> no hay riesgo -------------
  // También cubre el caso CP-07: temperatura alta pero la humedad
  // está bien, así que ninguna regla anterior aplica y el sistema
  // se considera Normal (LED verde, todo apagado).
  return {
    bombaAgua: 0,
    ventiladores: 0,
    alarmaSonora: 0,
    estadoLuzLED: 1,
    estado: 'NORMAL',
    regla: 'Regla 3 · Estado Normal',
  };
}

/* ---------- Matriz de casos de prueba (documento, sección 6) ---------- */
export type CasoPrueba = {
  id: string;
  temp: number;
  hum: number;
  esperado: 'NORMAL' | 'ADVERTENCIA' | 'CRITICO';
};

export const CASOS_PRUEBA: CasoPrueba[] = [
  { id: 'CP-01', temp: 22, hum: 60, esperado: 'NORMAL' },
  { id: 'CP-02', temp: 30, hum: 30, esperado: 'NORMAL' },
  { id: 'CP-03', temp: 25, hum: 15, esperado: 'ADVERTENCIA' },
  { id: 'CP-04', temp: 35, hum: 20, esperado: 'ADVERTENCIA' },
  { id: 'CP-05', temp: 40, hum: 10, esperado: 'CRITICO' },
  { id: 'CP-06', temp: 45, hum: 5, esperado: 'CRITICO' },
  { id: 'CP-07', temp: 38, hum: 55, esperado: 'NORMAL' },
  { id: 'CP-08', temp: 18, hum: 80, esperado: 'NORMAL' },
];
