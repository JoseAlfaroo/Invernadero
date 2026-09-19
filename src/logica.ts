/* =========================================================================
   LÓGICA DEL INVERNADERO INTELIGENTE
   Modelo de Arquitectura de Computadoras:
   ENTRADA  ->  PROCESAMIENTO  ->  MEMORIA  ->  SALIDA
   Todos los datos son enteros sin signo de 8 bits (0..255): no se usa punto
   flotante y las conversiones de base se hacen con desplazamientos, máscaras
   y divisiones enteras, sin librerías.
   ========================================================================= */

export type Bit = 0 | 1;

/* ---------- ENTRADA: sensores simulados -------------------------------- */
export type Entradas = {
  humedadSuelo: number; // VAR_HUM, 0..100 %
  temperaturaAmbiente: number; // VAR_TEMP, 0..50 °C
};

/* ---------- MEMORIA persistente (ROM/Flash): umbrales de control -------- */
// La lógica de decisión recibe los umbrales desde aquí y no los tiene escritos
// en sus comparaciones: recalibrar un sensor solo exige cambiar estos valores.
export type ParametrosControl = {
  UMBRAL_HUM: number; // humedad mínima del suelo (%)
  UMBRAL_TEMP: number; // temperatura máxima del aire (°C)
};

export const MEMORIA_PERSISTENTE: ParametrosControl = {
  UMBRAL_HUM: 30, // 0001 1110 = 0x1E
  UMBRAL_TEMP: 35, // 0010 0011 = 0x23
};

/* ---------- MEMORIA volátil (RAM): mapa de bits de REG_ACT -------------- */
//  bit   7     6     5   |   4      3   |    2        1        0
//        RESERVADOS      |  SEV1   SEV0 |  ALARMA   VENTIL   BOMBA
export const MASK_BOMBA = 0b0000_0001;
export const MASK_VENTIL = 0b0000_0010;
export const MASK_ALARMA = 0b0000_0100;
export const MASK_SEV = 0b0001_1000;
export const SHIFT_SEV = 3;

/* ---------- Estados: el índice de cada uno ES su código S₁S₀ ------------ */
export const ESTADOS = ['NORMAL', 'ADV_HIDRICA', 'ADV_TERMICA', 'CRITICO'] as const;
export type Estado = (typeof ESTADOS)[number];
export type Severidad = 0 | 1 | 2 | 3; // 00 · 01 · 10 · 11

export const NOMBRE_ESTADO: Record<Estado, string> = {
  NORMAL: 'Normal',
  ADV_HIDRICA: 'Advertencia Hídrica',
  ADV_TERMICA: 'Advertencia Térmica',
  CRITICO: 'Estado Crítico',
};

export const LED: Record<Estado, { nombre: string; color: string }> = {
  NORMAL: { nombre: 'Verde', color: '#2ecc71' },
  ADV_HIDRICA: { nombre: 'Amarillo', color: '#f1c40f' },
  ADV_TERMICA: { nombre: 'Ámbar', color: '#e67e22' },
  CRITICO: { nombre: 'Rojo', color: '#e74c3c' },
};

/* ---------- Utilidad interna: dejar el valor como entero 0..255 -------- */
function aByte(numeroEntero: number): number {
  return Math.max(0, Math.min(255, Math.trunc(numeroEntero)));
}

// Tabla de caracteres: cada dígito (0..15) es el índice de su carácter.
const DIGITOS = '0123456789ABCDEF';

/* ---------- a) Decimal por divisiones sucesivas ------------------------ */
// Ej: 100 -> centenas 1, decenas 0, unidades 0 -> "100"
export function convertirADecimal(numeroEntero: number): string {
  const valor = aByte(numeroEntero);
  const centenas = Math.floor(valor / 100);
  const resto = valor % 100;
  const decenas = Math.floor(resto / 10);
  const unidades = resto % 10;
  let texto = '';
  if (centenas > 0) texto += DIGITOS[centenas];
  if (centenas > 0 || decenas > 0) texto += DIGITOS[decenas];
  return texto + DIGITOS[unidades];
}

/* ---------- b) Binario de 8 bits: se aísla cada bit, de b7 a b0 -------- */
// Ej: 35  ->  "00100011"
export function convertirABinario8Bits(numeroEntero: number): string {
  const valor = aByte(numeroEntero);
  let bits = '';
  for (let i = 7; i >= 0; i--) bits += DIGITOS[(valor >> i) & 1];
  return bits;
}

/* ---------- c) Hexadecimal por cuartetos (nibbles) --------------------- */
// Ej: 35  ->  nibble alto 2, nibble bajo 3  ->  "0x23"
export function convertirAHexadecimal(numeroEntero: number): string {
  const valor = aByte(numeroEntero);
  const nibbleAlto = (valor >> 4) & 0x0f;
  const nibbleBajo = valor & 0x0f;
  return '0x' + DIGITOS[nibbleAlto] + DIGITOS[nibbleBajo];
}

/* ---------- PROCESAMIENTO: resta de 8 bits en la ALU ------------------- */
// La ALU resta sumando el complemento a dos del sustraendo (M + ~S + 1); el
// noveno bit de esa suma es el acarreo de salida del sumador.
// Convención AVR: la bandera C vale 1 cuando la resta pide préstamo (M < S),
// es decir, C = NOT acarreo. ARM y 6502 usan la polaridad inversa.
export type RestaALU = {
  resultado: number; // 8 bits: 29 − 30 da 0xFF
  prestamo: Bit; // bandera C = FLAG_BORROW
};

export function restarEnALU(minuendo: number, sustraendo: number): RestaALU {
  const suma = (minuendo & 0xff) + (~sustraendo & 0xff) + 1;
  const acarreo = (suma >> 8) & 1;
  return { resultado: suma & 0xff, prestamo: (acarreo ^ 1) as Bit };
}

/* ---------- Tipo con todas las SALIDAS del sistema -------------------- */
export type Salidas = {
  restaTemperatura: RestaALU; // UMBRAL_TEMP − VAR_TEMP
  restaHumedad: RestaALU; // VAR_HUM − UMBRAL_HUM
  flagTempAlta: Bit; // A
  flagHumBaja: Bit; // B
  bombaAgua: Bit; // Y_B
  ventiladores: Bit; // Y_V
  alarmaSonora: Bit; // Y_A
  severidad: Severidad; // S₁S₀
  estado: Estado;
  regAct: number; // registro empaquetado REG_ACT (0..255)
};

/* ---------- PROCESAMIENTO: evaluar el estado del sistema ----------- */
// No hay una regla por estado: las cuatro combinaciones de A y B salen de las
// ecuaciones simplificadas por álgebra de Boole.
export function evaluarEstadoSistema(
  entradas: Entradas,
  memoria: ParametrosControl = MEMORIA_PERSISTENTE,
): Salidas {
  const hum = aByte(entradas.humedadSuelo);
  const temp = aByte(entradas.temperaturaAmbiente);

  // 1) Comparación en la ALU: el préstamo de cada resta es la bandera de umbral
  const restaTemperatura = restarEnALU(memoria.UMBRAL_TEMP, temp); // C = 1 ⇔ T > 35
  const restaHumedad = restarEnALU(hum, memoria.UMBRAL_HUM); // C = 1 ⇔ H < 30
  const A = restaTemperatura.prestamo; // FLAG_TEMP_ALTA
  const B = restaHumedad.prestamo; // FLAG_HUM_BAJA

  // 2) Ecuaciones de salida
  const bombaAgua = B; // Y_B = B
  const ventiladores = A; // Y_V = A
  const alarmaSonora = (A & B) as Bit; // Y_A = A · B (solo estado crítico)
  const severidad = ((A << 1) | B) as Severidad; // S₁ = A, S₀ = B

  // 3) Carga de REG_ACT: reinicio, máscaras OR y severidad desplazada 3 bits
  let regAct = 0x00;
  if (bombaAgua) regAct |= MASK_BOMBA;
  if (ventiladores) regAct |= MASK_VENTIL;
  if (alarmaSonora) regAct |= MASK_ALARMA;
  regAct |= severidad << SHIFT_SEV;

  return {
    restaTemperatura,
    restaHumedad,
    flagTempAlta: A,
    flagHumBaja: B,
    bombaAgua,
    ventiladores,
    alarmaSonora,
    severidad,
    estado: ESTADOS[severidad],
    regAct,
  };
}
