# spec — Alineación del prototipo con el documento calificado (PC06)

**Proyecto:** Invernadero Inteligente — Grupo 3, Arquitectura del Computador
**Base:** T1 calificada 20/20 y su retroalimentación del 21/09/2026
**Entrega:** PC06, domingo 27/09 23:59

Dos cambios. El primero es obligatorio y urgente; el segundo resuelve la observación 5.

---

## 1. Revertir la ecuación de la alarma a `Y_A = A` *(obligatorio)*

### Por qué

El prototipo y el documento calificado no coinciden:

| | Documento T1 (20/20) | Código actual |
|---|---|---|
| Ecuación de la alarma | `Y_A = A` | `Y_A = A · B` |
| Sirena en Adv. Térmica | **ON** | OFF |
| REG_ACT en Adv. Térmica | **`0x16`** | `0x12` |
| CP-04 / CP-11, sirena | **ON** | OFF |

La retroalimentación del docente es explícita:

> «El ejemplo que obtiene **REG_ACT = 0x16** para temperatura de 38 °C y humedad de 55 % está correctamente desarrollado.»

Y la PC06 exige textualmente *«coherencia entre el problema, las funcionalidades, la arquitectura y el prototipo presentado»*, además de evidencias visuales. Una captura del HUD con `0x12` contradice el valor que el docente verificó a mano.

**Se corrige el código, no el documento.** El documento tiene su propia justificación (riesgo térmico directo: por encima de 35 °C en estructura cerrada el cultivo sufre en lapsos breves, con independencia de la humedad del suelo), el docente la aceptó y la entrega obtuvo nota perfecta.

### Cambios en `src/logica.ts`

```ts
// ANTES
const alarmaSonora: Bit = (A & B) as Bit;

// AHORA
const alarmaSonora: Bit = A;      // Y_A = A — riesgo térmico directo
```

La severidad **no cambia**: sigue siendo `(A << 1) | B`. Solo cambia el bit 2 de `REG_ACT`.

### Valores esperados después del cambio

| Estado | A | B | Bomba | Vent. | Alarma | S₁S₀ | REG_ACT |
|---|---|---|---|---|---|---|---|
| Normal | 0 | 0 | 0 | 0 | 0 | `00` | `0x00` |
| Adv. Hídrica | 0 | 1 | 1 | 0 | 0 | `01` | `0x09` |
| **Adv. Térmica** | 1 | 0 | 0 | 1 | **1** | `10` | **`0x16`** |
| Crítico | 1 | 1 | 1 | 1 | 1 | `11` | `0x1F` |

Solo cambia la tercera fila: `0x12` → `0x16`.

### Cambios en `src/casosPrueba.ts` y `src/logica.test.ts`

Los casos que esperan `0x12` pasan a `0x16`, y la matriz debe alinearse con los **doce** casos del documento (CP-01 a CP-12), no con los trece del spec anterior:

```ts
export const CASOS: Caso[] = [
  { id: 'CP-01', h: 45,  t: 24, estado: 'NORMAL',      reg: 0x00 },
  { id: 'CP-02', h: 50,  t: 20, estado: 'NORMAL',      reg: 0x00 },
  { id: 'CP-03', h: 20,  t: 25, estado: 'ADV_HIDRICA', reg: 0x09 },
  { id: 'CP-04', h: 40,  t: 38, estado: 'ADV_TERMICA', reg: 0x16 },  // ← era 0x12
  { id: 'CP-05', h: 15,  t: 40, estado: 'CRITICO',     reg: 0x1F },
  { id: 'CP-06', h: 100, t: 35, estado: 'NORMAL',      reg: 0x00 },
  { id: 'CP-07', h: 0,   t: 0,  estado: 'ADV_HIDRICA', reg: 0x09 },
  // fronteras (numeración del documento)
  { id: 'CP-08', h: 30,  t: 20, estado: 'NORMAL',      reg: 0x00 },  // «≥» no activa en 30
  { id: 'CP-09', h: 29,  t: 20, estado: 'ADV_HIDRICA', reg: 0x09 },  // «<»  activa en 29
  { id: 'CP-10', h: 50,  t: 35, estado: 'NORMAL',      reg: 0x00 },  // «≤» no activa en 35
  { id: 'CP-11', h: 50,  t: 36, estado: 'ADV_TERMICA', reg: 0x16 },  // «>»  activa en 36
  { id: 'CP-12', h: 29,  t: 36, estado: 'CRITICO',     reg: 0x1F },  // ambos cruzados
];
```

> **Ojo con la renumeración.** El documento numera las fronteras CP-08 a CP-12; el código las tenía como CP-F1 a CP-F6 y con un CP-F5 (30 %, 35 °C) que el documento no incluye. Usar la numeración del documento: son doce casos, y el docente los contó («El plan de pruebas incluye 12 escenarios»).

### Cambio en `src/juego/animaciones.ts`

La frase `'¡Alarma activada!'` vuelve a ser válida en `ADV_TERMICA`, porque la sirena suena ahí.

---

## 2. Diferenciar advertencia térmica de estado crítico *(observación 5)*

### Principio

La diferenciación va **íntegramente en la capa de presentación**, decodificando `S₁S₀`. `REG_ACT` no se toca: `0x16` y `0x1F` se conservan.

No usar un bit reservado `[7:5]` como bandera de intermitencia: duplicaría información que `S₁S₀` ya contiene y podría desincronizarse. El registro guarda el estado; la vista lo decodifica.

### Tabla de patrones

| S₁S₀ | Estado | LED | Alarma |
|---|---|---|---|
| `00` | Normal | Verde fijo | Silencio |
| `01` | Adv. Hídrica | Amarillo fijo | Silencio |
| `10` | Adv. Térmica | **Rojo intermitente (2 Hz)** | **Pulsos intermitentes** |
| `11` | Crítico | **Rojo fijo** | **Tono continuo** |

**Importante:** el ámbar que el código introdujo para `10` debe volver a rojo. El documento dice «Rojo» en las tres tablas que el docente leyó, y la observación 5 pide diferenciar por *patrón*, no por color. Cambiar el color rompería la coherencia con el documento sin resolver la observación.

### Implementación sugerida

```ts
export const PRESENTACION: Record<Estado, {
  color: string; label: string; parpadea: boolean; patronAlarma: 'silencio' | 'pulsos' | 'continuo';
}> = {
  NORMAL:      { color: '#3FAE5A', label: 'Verde fijo',        parpadea: false, patronAlarma: 'silencio' },
  ADV_HIDRICA: { color: '#E8C547', label: 'Amarillo fijo',     parpadea: false, patronAlarma: 'silencio' },
  ADV_TERMICA: { color: '#D64545', label: 'Rojo intermitente', parpadea: true,  patronAlarma: 'pulsos'   },
  CRITICO:     { color: '#D64545', label: 'Rojo fijo',         parpadea: false, patronAlarma: 'continuo' },
};
```

El parpadeo a 2 Hz (500 ms encendido / 500 ms apagado) se resuelve con una animación CSS o alternando la opacidad según el contador de frames que el canvas ya lleva:

```css
@keyframes latido { 0%, 49% { opacity: 1 } 50%, 100% { opacity: .22 } }
.led--parpadea { animation: latido 1s steps(1, end) infinite; }
```

Si el LED se dibuja en el canvas, la misma condición sale del frame:

```ts
const visible = !p.parpadea || Math.floor(frame / 30) % 2 === 0;  // ~60 fps → 2 Hz
```

### En el HUD

Añadir el patrón decodificado como una fila más, para que la auditoría técnica vea la decodificación y no solo el registro:

```
SEVERIDAD (S1S0)   2   10
PATRÓN LED             Rojo intermitente
PATRÓN ALARMA          Pulsos intermitentes
```

Esa fila es la evidencia de que la observación 5 está implementada y no solo documentada.

---

## 3. Verificación antes de capturar evidencias

- [ ] `npm test` en verde con los doce casos y `CP-04 → 0x16`.
- [ ] CP-04 en el navegador: LED rojo parpadeando, sirena activa, `REG_ACT = 0x16`, bomba apagada.
- [ ] CP-05 en el navegador: LED rojo fijo, tono continuo, `REG_ACT = 0x1F`.
- [ ] CP-08 (30 %, 20 °C): bomba apagada, estado Normal, `REG_ACT = 0x00`.
- [ ] Ninguna etiqueta «Ámbar» en la interfaz.
- [ ] El HUD muestra `0x16` y no `0x12` en advertencia térmica.

## 4. Capturas para la PC06

La PC06 pide evidencias visuales por escenario. Mínimo recomendado, seis capturas:

| Escenario | Qué debe evidenciar |
|---|---|
| CP-02 (50 %, 20 °C) | Normal · verde fijo · `0x00` |
| CP-03 (20 %, 25 °C) | Adv. Hídrica · amarillo · bomba ON · `0x09` |
| CP-04 (40 %, 38 °C) | Adv. Térmica · **rojo parpadeando** · sirena ON · `0x16` |
| CP-05 (15 %, 40 °C) | Crítico · **rojo fijo** · todos ON · `0x1F` |
| CP-08 (30 %, 20 °C) | Frontera «≥» · bomba OFF · `0x00` |
| CP-11 (50 %, 36 °C) | Frontera «>» · Adv. Térmica · `0x16` |

Para el parpadeo, dos capturas consecutivas del mismo escenario (LED encendido y apagado) puestas una al lado de la otra evidencian la intermitencia mejor que cualquier descripción.
