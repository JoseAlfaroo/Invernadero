import { useEffect, useRef } from 'react';
import type { Salidas } from './logica';
import {
  CASOS_PRUEBA,
  NOMBRE_LED,
  UMBRAL_HUMEDAD_BAJA,
  UMBRAL_TEMP_CRITICA,
  convertirABinario8Bits,
  convertirAHexadecimal,
  evaluarEstadoSistema,
} from './logica';

/* Panel lateral derecho.
   - Zona 2 (HUD de Entrada): sliders y botones +/- para humedad y temperatura.
   - Zona 3 (HUD de Arquitectura): decimal / binario 8 bits / hex, memoria,
     estado del sistema, actuadores y matriz de casos de prueba.
   Es d) actualizarHUD(): en React no tocamos el DOM a mano, basta con
   volver a renderizar con los props nuevos. */

type Props = {
  humedad: number;
  temperatura: number;
  salidas: Salidas;
  setHumedad: (n: number) => void;
  setTemperatura: (n: number) => void;
};

function limitar(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/* fila con la representación de un valor en las 3 bases */
function FilaArq({ nombre, valor }: { nombre: string; valor: number }) {
  return (
    <div className="arq-fila">
      <span className="arq-nombre">{nombre}</span>
      <span className="arq-dec">{valor}</span>
      <span className="arq-bin">{convertirABinario8Bits(valor)}</span>
      <span className="arq-hex">{convertirAHexadecimal(valor)}</span>
    </div>
  );
}

/* chip ON / OFF para un actuador binario */
function Chip({ nombre, on, textoOn }: { nombre: string; on: 0 | 1; textoOn: string }) {
  return (
    <div className={`chip ${on === 1 ? 'chip-on' : 'chip-off'}`}>
      <span>{nombre}</span>
      <b>{on === 1 ? textoOn : 'OFF'}</b>
    </div>
  );
}

export default function PanelControl({
  humedad,
  temperatura,
  salidas,
  setHumedad,
  setTemperatura,
}: Props) {
  /* alarma sonora: pitido corto y repetido mientras alarmaSonora = 1 */
  const audioRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    if (salidas.alarmaSonora !== 1) return;
    if (!audioRef.current) audioRef.current = new AudioContext();
    const ac = audioRef.current;
    const id = setInterval(() => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.04;
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 0.15);
    }, 500);
    return () => clearInterval(id);
  }, [salidas.alarmaSonora]);

  return (
    <aside className="panel">
      <h1 className="panel-titulo">Invernadero Inteligente</h1>
      <p className="panel-sub">Entrada → Procesamiento → Memoria → Salida</p>

      {/* ---------------- ZONA 2: ENTRADAS ---------------- */}
      <section className="bloque">
        <h2>Zona 2 · Panel de Control (Entradas)</h2>

        <div className="control">
          <label>Humedad del suelo — <b>{humedad}%</b></label>
          <div className="control-fila">
            <button onClick={() => setHumedad(limitar(humedad - 1, 0, 100))}>−</button>
            <input
              type="range"
              min={0}
              max={100}
              value={humedad}
              onChange={(e) => setHumedad(Number(e.target.value))}
            />
            <button onClick={() => setHumedad(limitar(humedad + 1, 0, 100))}>+</button>
          </div>
        </div>

        <div className="control">
          <label>Temperatura ambiente — <b>{temperatura}°C</b></label>
          <div className="control-fila">
            <button onClick={() => setTemperatura(limitar(temperatura - 1, 0, 50))}>−</button>
            <input
              type="range"
              min={0}
              max={50}
              value={temperatura}
              onChange={(e) => setTemperatura(Number(e.target.value))}
            />
            <button onClick={() => setTemperatura(limitar(temperatura + 1, 0, 50))}>+</button>
          </div>
        </div>
      </section>

      {/* ---------------- ZONA 3: ARQUITECTURA ---------------- */}
      <section className="bloque">
        <h2>Zona 3 · HUD de Arquitectura</h2>

        <div className="arq-fila arq-cabecera">
          <span className="arq-nombre">variable</span>
          <span className="arq-dec">DEC</span>
          <span className="arq-bin">BIN (8 bits)</span>
          <span className="arq-hex">HEX</span>
        </div>
        <FilaArq nombre="humedadSuelo" valor={humedad} />
        <FilaArq nombre="temperaturaAmbiente" valor={temperatura} />

        <p className="mini-titulo">Memoria (parámetros fijos)</p>
        <FilaArq nombre="UMBRAL_HUMEDAD_BAJA" valor={UMBRAL_HUMEDAD_BAJA} />
        <FilaArq nombre="UMBRAL_TEMP_CRITICA" valor={UMBRAL_TEMP_CRITICA} />
      </section>

      {/* ---------------- SALIDA: ESTADO + ACTUADORES ---------------- */}
      <section className="bloque">
        <h2>Salida · Estado del Sistema</h2>
        <div className={`estado estado-${salidas.estado.toLowerCase()}`}>
          <b>{salidas.estado}</b>
          <span>{salidas.regla}</span>
        </div>

        <div className="chips">
          <Chip nombre="bombaAgua" on={salidas.bombaAgua} textoOn="RIEGO" />
          <Chip nombre="ventiladores" on={salidas.ventiladores} textoOn="ON" />
          <Chip nombre="alarmaSonora" on={salidas.alarmaSonora} textoOn="SONANDO" />
          <div className="chip">
            <span>estadoLuzLED</span>
            <b className={`led led-${salidas.estadoLuzLED}`}>
              {salidas.estadoLuzLED} · {NOMBRE_LED[salidas.estadoLuzLED]}
            </b>
          </div>
        </div>
      </section>

      {/* ---------------- CASOS DE PRUEBA ---------------- */}
      <section className="bloque">
        <h2>Matriz de Casos de Prueba</h2>
        <table className="tabla">
          <thead>
            <tr>
              <th>ID</th><th>T°</th><th>H%</th><th>Esperado</th><th>Real</th><th></th>
            </tr>
          </thead>
          <tbody>
            {CASOS_PRUEBA.map((c) => {
              const real = evaluarEstadoSistema(c.hum, c.temp).estado;
              const ok = real === c.esperado;
              return (
                <tr key={c.id} className={ok ? 'ok' : 'fail'}>
                  <td>{c.id}</td>
                  <td>{c.temp}</td>
                  <td>{c.hum}</td>
                  <td>{c.esperado}</td>
                  <td>{real}</td>
                  <td>{ok ? '✔' : '✗'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </aside>
  );
}
