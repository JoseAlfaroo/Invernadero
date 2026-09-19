# spec.md — Corrección de la lógica de severidad y del registro de salidas

**Proyecto:** Invernadero Inteligente — Arquitectura del Computador, Grupo 3
**Origen:** retroalimentación del docente a la PC04 (observaciones 2, 3, 4, 5, 7 y 8)
**Objetivo:** alinear el código del prototipo con el modelo corregido que se entrega en la T1.

> El documento de la T1 ya describe este comportamiento. Si el código no lo implementa,
> la captura del prototipo contradice el texto y la incoherencia es visible en la sustentación.

---

## 0. Estado actual y alcance

Verificado a partir de las capturas del prototipo y de `src/juego/animaciones.ts`:

| Evidencia | Situación |
|---|---|
| HUD muestra `estadoLuzLED: 3 · Rojo` con etiqueta `Media-Alta` | Codificación de severidad antigua (1/2/3) |
| HUD muestra `Regla 2 · Media-Alta` | Numeración de reglas heredada del documento de definición (3 reglas) |
| `FRASES: Record<Salidas['estado'], string[]>` tiene 3 claves: `NORMAL`, `ADVERTENCIA`, `CRITICO` | El tipo `Estado` aún no distingue advertencia hídrica de térmica |
| El HUD no muestra `REG_ACT` | El registro empaquetado está documentado pero no expuesto |

**Fuera de alcance:** el motor de canvas, las colisiones, el movimiento del jugador y el arte.
Ningún cambio de este spec toca `colision.ts`, `dibujo.ts` ni `objetos.ts`.

---

## 1. Contrato objetivo

Cuatro estados mutuamente excluyentes, derivados de dos banderas de umbral:

```
A = FLAG_TEMP_ALTA = (temperaturaAmbiente > 35)
B = FLAG_HUM_BAJA  = (humedadSuelo < 30)
```

| Estado | A | B | Bomba | Ventiladores | Alarma | Severidad S₁S₀ | LED | REG_ACT |
|---|---|---|---|---|---|---|---|---|
| `NORMAL` | 0 | 0 | 0 | 0 | 0 | `00` (0) | Verde | `0x00` |
| `ADV_HIDRICA` | 0 | 1 | 1 | 0 | 0 | `01` (1) | Amarillo | `0x09` |
| `ADV_TERMICA` | 1 | 0 | 0 | 1 | 0 | `10` (2) | Ámbar | `0x12` |
| `CRITICO` | 1 | 1 | 1 | 1 | 1 | `11` (3) | Rojo | `0x1F` |

Ecuaciones resultantes:

```
Y_B (bomba)        = B
Y_V (ventiladores) = A
Y_A (alarma)       = A · B      ← la alarma queda reservada al estado crítico
S₁ = A             S₀ = B       ← la severidad es la concatenación de ambas banderas
```

Mapa de bits de `REG_ACT` (8 bits sin signo):

```
 bit 7   6   5     4     3       2       1       0
      RESERVADOS   SEV1  SEV0  ALARMA  VENTIL  BOMBA
```

---

## 2. `src/logica.ts` — núcleo

### 2.1 Tipos y constantes

```ts
export const UMBRAL_HUMEDAD_BAJA = 30;   // %
export const UMBRAL_TEMP_CRITICA = 35;   // °C

export type Estado = 'NORMAL' | 'ADV_HIDRICA' | 'ADV_TERMICA' | 'CRITICO';
export type Bit = 0 | 1;
export type Severidad = 0 | 1 | 2 | 3;

/** Orden significativo: el índice coincide con el código de severidad S₁S₀. */
export const ESTADOS = ['NORMAL', 'ADV_HIDRICA', 'ADV_TERMICA', 'CRITICO'] as const;

export interface Entradas {
  humedadSuelo: number;         // uint8, 0..100
  temperaturaAmbiente: number;  // uint8, 0..50
}

export interface Salidas {
  estado: Estado;
  severidad: Severidad;   // S₁S₀
  flagTempAlta: Bit;      // A
  flagHumBaja: Bit;       // B
  bombaAgua: Bit;         // Y_B
  ventiladores: Bit;      // Y_V
  alarmaSonora: Bit;      // Y_A
  regAct: number;         // registro empaquetado, 0..255
}
```

### 2.2 Máscaras

```ts
export const MASK_BOMBA  = 0b00000001;
export const MASK_VENTIL = 0b00000010;
export const MASK_ALARMA = 0b00000100;
export const SHIFT_SEV   = 3;
export const MASK_SEV    = 0b00011000;
```

### 2.3 `evaluarEstadoSistema`

```ts
export function evaluarEstadoSistema(e: Entradas): Salidas {
  const A: Bit = e.temperaturaAmbiente > UMBRAL_TEMP_CRITICA ? 1 : 0;
  const B: Bit = e.humedadSuelo < UMBRAL_HUMEDAD_BAJA ? 1 : 0;

  const bombaAgua:    Bit = B;
  const ventiladores: Bit = A;
  const alarmaSonora: Bit = (A & B) as Bit;

  // S₁ = A, S₀ = B  →  la severidad ES la concatenación de las banderas
  const severidad = ((A << 1) | B) as Severidad;

  let regAct = 0x00;
  if (bombaAgua)    regAct |= MASK_BOMBA;
  if (ventiladores) regAct |= MASK_VENTIL;
  if (alarmaSonora) regAct |= MASK_ALARMA;
  regAct |= (severidad << SHIFT_SEV);
  regAct &= 0xFF;

  return {
    estado: ESTADOS[severidad],
    severidad, flagTempAlta: A, flagHumBaja: B,
    bombaAgua, ventiladores, alarmaSonora, regAct,
  };
}
```

**Lo importante de esta implementación:** no hay cadena de `if/else if` por regla. La severidad
sale de un desplazamiento y un OR, y el estado se obtiene indexando por severidad. Eso es
exactamente lo que afirma el documento, y se puede mostrar en pantalla durante la sustentación.

### 2.4 Conversión de base

```ts
export const aBinario8 = (v: number) => (v & 0xFF).toString(2).padStart(8, '0');
export const aHex2     = (v: number) => (v & 0xFF).toString(16).toUpperCase().padStart(2, '0');
export const aBinario2 = (v: number) => (v & 0b11).toString(2).padStart(2, '0');
```

`aHex2` devuelve `"1E"`. Si el HUD muestra el sufijo `H`, componerlo en la vista
(`` `${aHex2(v)}H` ``), no dentro de la función.

### 2.5 Mapa del LED

```ts
export const LED: Record<Estado, { label: string; color: string; etiqueta: string }> = {
  NORMAL:      { label: 'Verde',    color: '#3FAE5A', etiqueta: 'Normal' },
  ADV_HIDRICA: { label: 'Amarillo', color: '#E8C547', etiqueta: 'Advertencia Hídrica' },
  ADV_TERMICA: { label: 'Ámbar',    color: '#E08A2E', etiqueta: 'Advertencia Térmica' },
  CRITICO:     { label: 'Rojo',     color: '#D64545', etiqueta: 'Estado Crítico' },
};
```

Eliminar las etiquetas `Media`, `Media-Alta` y `Alta`, y la numeración `Regla 1..3`: ya no
corresponden al documento. Si se quiere conservar numeración de reglas, debe ser 1 a 4 en el
mismo orden que `ESTADOS`.

---

## 3. `src/juego/animaciones.ts` — riesgo de ruptura

`FRASES` está tipado como `Record<Salidas['estado'], string[]>` con tres claves. Al ampliar
`Estado` a cuatro miembros, **TypeScript va a marcar error por clave faltante**. Eso es
deseable: es una barrera en tiempo de compilación. Hay que escribir el cuarto conjunto.

```ts
export const FRASES: Record<Estado, string[]> = {
  NORMAL: ['Todo tranquilo por aquí 🌱', 'Las plantas se ven felices', 'Nada que reportar, por ahora'],
  ADV_HIDRICA: ['La tierra se está secando...', 'Mejor activo el riego', 'Hay que vigilar la humedad'],
  ADV_TERMICA: ['Está subiendo mucho la temperatura', 'Enciendo los ventiladores', 'El suelo está bien, el aire no'],
  CRITICO: ['¡Esto es crítico!', '¡Necesita agua YA!', '¡Alarma activada!'],
};
```

Nótese que `'¡Alarma activada!'` solo es cierto en `CRITICO` bajo la nueva regla de la alarma.
No reutilizar esa frase en `ADV_TERMICA`.

`fraseActual` no cambia, pero conviene blindarla ante una clave inesperada:

```ts
export function fraseActual(estado: Estado, frame: number): string {
  const frases = FRASES[estado] ?? FRASES.NORMAL;
  return frases[Math.floor(frame / 130) % frases.length];
}
```

---

## 4. `src/PanelControl.tsx` — HUD

La Zona 3 debe exponer el registro y las banderas, que hoy no se ven. Filas a añadir bajo
`MEMORIA (PARÁMETROS FIJOS)`:

| Etiqueta | DEC | BIN | HEX |
|---|---|---|---|
| `FLAG_TEMP_ALTA (A)` | `flagTempAlta` | — | — |
| `FLAG_HUM_BAJA (B)` | `flagHumBaja` | — | — |
| `SEVERIDAD (S1S0)` | `severidad` | `aBinario2(severidad)` | — |
| `REG_ACT` | `regAct` | `aBinario8(regAct)` | `aHex2(regAct)` |

Y un desglose de bits de `REG_ACT`, que es lo que conecta la pantalla con la sección del
documento:

```
REG_ACT  0 0 0 | 1 0 | 0 1 0     0x12
         ─────   ───   ─ ─ ─
         RESV    SEV   A V B
```

Sugerencia para la sustentación: resaltar en color el bit que cambió respecto al ciclo
anterior. Convierte «hay números en pantalla» en «se entiende qué pasó».

El bloque `SALIDA · ESTADO DEL SISTEMA` debe mostrar `LED[estado].etiqueta` y el color
`LED[estado].color`, no la cadena `Media-Alta`.

---

## 5. Pruebas

Crear `src/logica.test.ts` (o `src/casos.ts` si no hay runner instalado). Los casos
reproducen literalmente la matriz de la T1, incluidas las pruebas de frontera de la obs. 7.

```ts
type Caso = { id: string; h: number; t: number; estado: Estado; reg: number };

export const CASOS: Caso[] = [
  { id: 'CP-01', h: 45,  t: 24, estado: 'NORMAL',      reg: 0x00 },
  { id: 'CP-02', h: 50,  t: 20, estado: 'NORMAL',      reg: 0x00 },
  { id: 'CP-03', h: 20,  t: 25, estado: 'ADV_HIDRICA', reg: 0x09 },
  { id: 'CP-04', h: 40,  t: 38, estado: 'ADV_TERMICA', reg: 0x12 },
  { id: 'CP-05', h: 15,  t: 40, estado: 'CRITICO',     reg: 0x1F },
  { id: 'CP-06', h: 100, t: 35, estado: 'NORMAL',      reg: 0x00 },
  { id: 'CP-07', h: 0,   t: 0,  estado: 'ADV_HIDRICA', reg: 0x09 },

  // --- pruebas de frontera (observación 7) ---
  { id: 'CP-F1', h: 29,  t: 20, estado: 'ADV_HIDRICA', reg: 0x09 }, // «<»  activa en 29
  { id: 'CP-F2', h: 30,  t: 20, estado: 'NORMAL',      reg: 0x00 }, // «≥»  no activa en 30
  { id: 'CP-F3', h: 50,  t: 35, estado: 'NORMAL',      reg: 0x00 }, // «≤»  no activa en 35
  { id: 'CP-F4', h: 50,  t: 36, estado: 'ADV_TERMICA', reg: 0x12 }, // «>»  activa en 36
  { id: 'CP-F5', h: 30,  t: 35, estado: 'NORMAL',      reg: 0x00 }, // ambos umbrales exactos
  { id: 'CP-F6', h: 29,  t: 36, estado: 'CRITICO',     reg: 0x1F }, // ambos cruzados al mínimo
];
```

Verificación mínima sin framework de pruebas:

```ts
CASOS.forEach(c => {
  const s = evaluarEstadoSistema({ humedadSuelo: c.h, temperaturaAmbiente: c.t });
  const ok = s.estado === c.estado && s.regAct === c.reg;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${c.id}  ${s.estado}  0x${aHex2(s.regAct)}`);
});
```

Los seis casos de frontera son los que fallarían si alguien escribe `>=` donde va `>`.
Ese error no se detecta con los escenarios generales.

---

## 6. Coherencia documental

`Definicion_caso_Invernadero.pdf` quedó desactualizado y **no debe usarse como referencia
para programar** hasta corregirlo:

- Describe tres reglas; el sistema ahora tiene cuatro.
- `estadoLuzLED` figura como `1 (Verde) / 2 (Amarillo) / 3 (Rojo)`; ahora es `0..3`.
- El caso `CP-07` (Temp 38, Humedad 55) aparece como **Normal con ventilador apagado**, que es
  justamente lo contrario de la 4.ª regla. Es la contradicción más peligrosa del documento.
- Lista ODS 2, 6, 11 y 12; el proyecto usa solo 6 y 12.
- Titula el caso como «invernaderos urbanos»; la denominación acordada es «invernaderos de
  pequeña escala en Ica» (observación 10).

---

## 7. Criterios de aceptación

- [ ] `Estado` tiene cuatro miembros y `ESTADOS[severidad]` devuelve el estado correcto.
- [ ] `evaluarEstadoSistema` calcula la severidad como `(A << 1) | B`, sin cadena de `if` por regla.
- [ ] `alarmaSonora` es `A & B` y no se activa en advertencia térmica.
- [ ] `regAct` coincide con `0x00 / 0x09 / 0x12 / 0x1F` en los cuatro estados.
- [ ] `FRASES` tiene las cuatro claves y el proyecto compila sin errores de tipo.
- [ ] El HUD muestra `REG_ACT` en decimal, binario de 8 bits y hexadecimal, más las banderas A y B.
- [ ] Desaparecieron de la interfaz las etiquetas `Media`, `Media-Alta` y `Alta`.
- [ ] Los 13 casos de `CASOS` pasan.
- [ ] Se tomaron las capturas indicadas en el documento de la T1 (ver sección siguiente).

---

## 8. Capturas a tomar después del cambio

El documento de la T1 tiene dos marcadores `[PENDIENTE]` resaltados en amarillo esperando estas
imágenes. Tomarlas con la aplicación ya corregida:

| Captura | Escenario | Qué debe verse |
|---|---|---|
| **Reemplaza la actual** en «Avance de la Simulación Interactiva» | Humedad **40 %**, Temperatura **38 °C** (CP-04) | Advertencia Térmica · LED Ámbar · severidad `10` · `REG_ACT = 0x12` · bomba OFF · sirena OFF · ventiladores ON |
| **Nueva**, antes de «Planificación Inicial de Pruebas» | Humedad **30 %**, Temperatura **20 °C** (CP-F2) | Normal · LED Verde · severidad `00` · `REG_ACT = 0x00` · bomba OFF |

La segunda es la más valiosa: con 30 % exactos la bomba apagada demuestra visualmente que el
operador `≥` está bien implementado, que es lo que pide la observación 7.

Capturar la ventana completa, con la Zona 2 (entradas) y la Zona 3 (HUD) visibles en la misma
imagen, para que se vea la correspondencia entre el valor de entrada y el registro resultante.
