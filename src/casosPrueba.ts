/* =========================================================================
   MATRIZ DE CASOS DE PRUEBA (documento T1, Planificación Inicial de Pruebas)
   La usan el panel (tabla en vivo) y las pruebas automáticas (npm test).
   ========================================================================= */

import type { Estado } from './logica.ts';

export type CasoPrueba = {
  id: string;
  humedad: number; // %
  temperatura: number; // °C
  estado: Estado; // estado esperado
  regAct: number; // REG_ACT esperado
};

export const CASOS_PRUEBA: CasoPrueba[] = [
  { id: 'CP-01', humedad: 45, temperatura: 24, estado: 'NORMAL', regAct: 0x00 },
  { id: 'CP-02', humedad: 50, temperatura: 20, estado: 'NORMAL', regAct: 0x00 },
  { id: 'CP-03', humedad: 20, temperatura: 25, estado: 'ADV_HIDRICA', regAct: 0x09 },
  { id: 'CP-04', humedad: 40, temperatura: 38, estado: 'ADV_TERMICA', regAct: 0x12 },
  { id: 'CP-05', humedad: 15, temperatura: 40, estado: 'CRITICO', regAct: 0x1F },
  { id: 'CP-06', humedad: 100, temperatura: 35, estado: 'NORMAL', regAct: 0x00 },
  { id: 'CP-07', humedad: 0, temperatura: 0, estado: 'ADV_HIDRICA', regAct: 0x09 },

  // ---- pruebas de frontera: valores exactos junto a los umbrales ----
  { id: 'CP-F1', humedad: 29, temperatura: 20, estado: 'ADV_HIDRICA', regAct: 0x09 }, // «<»: 29 % activa B
  { id: 'CP-F2', humedad: 30, temperatura: 20, estado: 'NORMAL', regAct: 0x00 }, // «≥»: 30 % no activa B
  { id: 'CP-F3', humedad: 50, temperatura: 35, estado: 'NORMAL', regAct: 0x00 }, // «≤»: 35 °C no activa A
  { id: 'CP-F4', humedad: 50, temperatura: 36, estado: 'ADV_TERMICA', regAct: 0x12 }, // «>»: 36 °C activa A
  { id: 'CP-F5', humedad: 30, temperatura: 35, estado: 'NORMAL', regAct: 0x00 }, // ambos umbrales exactos
  { id: 'CP-F6', humedad: 29, temperatura: 36, estado: 'CRITICO', regAct: 0x1F }, // ambos cruzados al mínimo
];
