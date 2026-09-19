// Pruebas del núcleo lógico con el runner nativo de Node (sin dependencias): npm test

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { CASOS_PRUEBA } from './casosPrueba.ts';
import {
  ESTADOS,
  MASK_ALARMA,
  MASK_BOMBA,
  MASK_SEV,
  MASK_VENTIL,
  SHIFT_SEV,
  convertirABinario8Bits,
  convertirADecimal,
  convertirAHexadecimal,
  evaluarEstadoSistema,
  restarEnALU,
} from './logica.ts';

const evaluar = (humedadSuelo: number, temperaturaAmbiente: number) =>
  evaluarEstadoSistema({ humedadSuelo, temperaturaAmbiente });

describe('Matriz de casos de prueba de la T1', () => {
  for (const caso of CASOS_PRUEBA) {
    const nombre = `${caso.id}: H ${caso.humedad} %, T ${caso.temperatura} °C -> ${caso.estado}, REG_ACT ${convertirAHexadecimal(caso.regAct)}`;
    test(nombre, () => {
      const s = evaluar(caso.humedad, caso.temperatura);
      assert.equal(s.estado, caso.estado);
      assert.equal(s.regAct, caso.regAct);
    });
  }
});

describe('Lógica booleana y registro REG_ACT', () => {
  test('en todo el rango operativo se cumplen las ecuaciones simplificadas', () => {
    for (let h = 0; h <= 100; h++) {
      for (let t = 0; t <= 50; t++) {
        const s = evaluar(h, t);
        const A = t > 35 ? 1 : 0;
        const B = h < 30 ? 1 : 0;
        assert.deepEqual(
          { A: s.flagTempAlta, B: s.flagHumBaja, Y_B: s.bombaAgua, Y_V: s.ventiladores, Y_A: s.alarmaSonora, S: s.severidad },
          { A, B, Y_B: B, Y_V: A, Y_A: A & B, S: (A << 1) | B },
          `H = ${h} %, T = ${t} °C`,
        );
      }
    }
  });

  test('REG_ACT se decodifica sin ambigüedad con máscaras y desplazamiento', () => {
    const codigos = new Map<number, string>();
    for (let h = 0; h <= 100; h++) {
      for (let t = 0; t <= 50; t++) {
        const s = evaluar(h, t);
        assert.equal(s.regAct & 0b1110_0000, 0, 'bits reservados [7:5] en 0');
        assert.equal(ESTADOS[(s.regAct & MASK_SEV) >> SHIFT_SEV], s.estado);
        assert.equal((s.regAct & MASK_BOMBA) === 0 ? 0 : 1, s.bombaAgua);
        assert.equal((s.regAct & MASK_VENTIL) === 0 ? 0 : 1, s.ventiladores);
        assert.equal((s.regAct & MASK_ALARMA) === 0 ? 0 : 1, s.alarmaSonora);
        codigos.set(s.regAct, s.estado);
      }
    }
    // un código distinto por estado (antes térmica y crítico compartían 11)
    assert.deepEqual(codigos, new Map([[0x00, 'NORMAL'], [0x09, 'ADV_HIDRICA'], [0x12, 'ADV_TERMICA'], [0x1F, 'CRITICO']]));
  });

  test('ejemplo de consolidación del documento: T = 38 °C, H = 55 % -> 0x12', () => {
    const s = evaluar(55, 38);
    assert.equal(s.estado, 'ADV_TERMICA');
    assert.equal(s.alarmaSonora, 0);
    assert.equal(s.regAct, 0b0001_0000 | 0b0000_0010);
  });

  test('los umbrales se leen de la memoria y no están fijos en las comparaciones', () => {
    const recalibrado = { UMBRAL_HUM: 40, UMBRAL_TEMP: 30 };
    const s = evaluarEstadoSistema({ humedadSuelo: 35, temperaturaAmbiente: 32 }, recalibrado);
    assert.equal(s.estado, 'CRITICO');
    assert.equal(evaluar(35, 32).estado, 'NORMAL');
  });
});

describe('ALU: resta de 8 bits con bandera de préstamo (convención AVR)', () => {
  test('para todo par de bytes, C = 1 si y solo si minuendo < sustraendo', () => {
    for (let m = 0; m <= 255; m++) {
      for (let s = 0; s <= 255; s++) {
        const r = restarEnALU(m, s);
        if (r.resultado !== ((m - s + 256) & 0xff) || r.prestamo !== (m < s ? 1 : 0)) {
          assert.fail(`${m} − ${s}: resultado ${r.resultado}, C = ${r.prestamo}`);
        }
      }
    }
  });

  test('fronteras: 29 − 30 pide préstamo y 30 − 30 no', () => {
    assert.deepEqual(restarEnALU(29, 30), { resultado: 0xff, prestamo: 1 });
    assert.deepEqual(restarEnALU(30, 30), { resultado: 0x00, prestamo: 0 });
    assert.deepEqual(restarEnALU(35, 36), { resultado: 0xff, prestamo: 1 });
    assert.deepEqual(restarEnALU(35, 35), { resultado: 0x00, prestamo: 0 });
  });
});

describe('Conversión de bases sin librerías', () => {
  test('tabla multibase de parámetros críticos del documento', () => {
    const tabla: [number, string, string][] = [
      [0, '00000000', '0x00'],
      [30, '00011110', '0x1E'],
      [35, '00100011', '0x23'],
      [50, '00110010', '0x32'],
      [100, '01100100', '0x64'],
      [255, '11111111', '0xFF'],
    ];
    for (const [valor, binario, hexadecimal] of tabla) {
      assert.equal(convertirADecimal(valor), String(valor));
      assert.equal(convertirABinario8Bits(valor), binario);
      assert.equal(convertirAHexadecimal(valor), hexadecimal);
    }
  });

  test('coinciden con la referencia de JavaScript en todo el rango 0..255', () => {
    for (let v = 0; v <= 255; v++) {
      assert.equal(convertirADecimal(v), v.toString(10));
      assert.equal(convertirABinario8Bits(v), v.toString(2).padStart(8, '0'));
      assert.equal(convertirAHexadecimal(v), '0x' + v.toString(16).toUpperCase().padStart(2, '0'));
    }
  });
});
