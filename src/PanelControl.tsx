import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CASOS_PRUEBA } from './casosPrueba';
import type { Bit, Estado, RestaALU, Salidas } from './logica';
import {
  LED,
  MASK_SEV,
  MEMORIA_PERSISTENTE,
  NOMBRE_ESTADO,
  SHIFT_SEV,
  convertirABinario8Bits,
  convertirADecimal,
  convertirAHexadecimal,
  evaluarEstadoSistema,
} from './logica';

/* Panel lateral derecho.
   - Zona 2 (HUD de Entrada): sliders y botones +/- para humedad y temperatura.
   - Zona 3 (HUD de Arquitectura, vista técnica): decimal / binario 8 bits / hex,
     memoria, restas en la ALU y registro REG_ACT bit a bit.
   - Salida (vista operativa): estado en lenguaje simple, su causa y actuadores.
   - Matriz de casos de prueba de la T1, evaluada con la misma lógica.
   Es d) actualizarHUD(): en React no tocamos el DOM a mano, basta con
   volver a renderizar con los props nuevos. */

type Props = {
  humedad: number;
  temperatura: number;
  salidas: Salidas;
  setHumedad: (n: number) => void;
  setTemperatura: (n: number) => void;
};

const { UMBRAL_HUM, UMBRAL_TEMP } = MEMORIA_PERSISTENTE;

// los casos no dependen de lo que mueva el usuario: se evalúan una sola vez
const RESULTADOS_PRUEBA = CASOS_PRUEBA.map((caso) => {
  const real = evaluarEstadoSistema({ humedadSuelo: caso.humedad, temperaturaAmbiente: caso.temperatura });
  return { caso, real, ok: real.estado === caso.estado && real.regAct === caso.regAct };
});
const APROBADOS = RESULTADOS_PRUEBA.filter((r) => r.ok).length;

// significado de cada bit de REG_ACT, de b7 a b0
const BITS_REG_ACT = ['RESV', 'RESV', 'RESV', 'SEV1', 'SEV0', 'ALARMA', 'VENTIL', 'BOMBA'];

function limitar(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/* binario de 8 bits separado en cuartetos: "0010 0011" */
function binarioEnCuartetos(valor: number): string {
  const bits = convertirABinario8Bits(valor);
  return `${bits.slice(0, 4)} ${bits.slice(4)}`;
}

/* explica, sin notación técnica, qué originó el estado actual */
function describirCausa(estado: Estado, humedad: number, temperatura: number): string {
  const seco = `humedad ${humedad} %, bajo el mínimo de ${UMBRAL_HUM} %`;
  const calor = `temperatura ${temperatura} °C, sobre el máximo de ${UMBRAL_TEMP} °C`;
  switch (estado) {
    case 'NORMAL':
      return 'Humedad y temperatura dentro de rango: actuadores apagados.';
    case 'ADV_HIDRICA':
      return `Riego encendido: ${seco}.`;
    case 'ADV_TERMICA':
      return `Ventiladores encendidos: ${calor}.`;
    case 'CRITICO':
      return `Riego, ventiladores y alarma encendidos: ${seco}; ${calor}.`;
  }
}

/* fila con la representación de un valor en las 3 bases */
function FilaArq({ nombre, valor }: { nombre: string; valor: number }) {
  return (
    <div className="arq-fila">
      <span className="arq-nombre">{nombre}</span>
      <span className="arq-dec">{convertirADecimal(valor)}</span>
      <span className="arq-bin">{binarioEnCuartetos(valor)}</span>
      <span className="arq-hex">{convertirAHexadecimal(valor)}</span>
    </div>
  );
}

/* bandera de umbral = préstamo (C) de una resta de 8 bits en la ALU */
function FilaALU({
  bandera,
  operacion,
  minuendo,
  sustraendo,
  resta,
}: {
  bandera: string;
  operacion: string;
  minuendo: number;
  sustraendo: number;
  resta: RestaALU;
}) {
  return (
    <div className="alu">
      <div className="alu-bandera">
        <span>{bandera}</span>
        <b className={resta.prestamo === 1 ? 'bit-1' : 'bit-0'}>{resta.prestamo}</b>
      </div>
      <div className="alu-resta">
        {operacion} = {minuendo} − {sustraendo} = {convertirAHexadecimal(resta.resultado)} · C = {resta.prestamo}
      </div>
    </div>
  );
}

/* REG_ACT bit a bit; se resaltan los bits que cambiaron en la última
   transición, obtenidos con XOR entre el valor nuevo y el anterior */
function RegistroRegAct({ regAct }: { regAct: number }) {
  const [anterior, setAnterior] = useState(regAct);
  const [cambiados, setCambiados] = useState(0);
  if (regAct !== anterior) {
    setAnterior(regAct);
    setCambiados(regAct ^ anterior);
  }

  return (
    <div className="reg">
      {BITS_REG_ACT.map((nombre, k) => {
        const i = 7 - k;
        const bit = (regAct >> i) & 1;
        const grupo = i >= 5 ? 'reg-resv' : i >= 3 ? 'reg-sev' : 'reg-act';
        const cambio = (cambiados >> i) & 1 ? ' reg-cambio' : '';
        return (
          <div key={i} className={`reg-bit ${grupo}${bit ? ' reg-uno' : ''}${cambio}`}>
            <span className="reg-indice">b{i}</span>
            <b>{bit}</b>
            <span className="reg-nombre">{nombre}</span>
          </div>
        );
      })}
    </div>
  );
}

/* chip ON / OFF para un actuador binario */
function Chip({ nombre, bit }: { nombre: string; bit: Bit }) {
  return (
    <div className={`chip ${bit === 1 ? 'chip-on' : 'chip-off'}`}>
      <span>{nombre}</span>
      <b>{bit === 1 ? 'ON' : 'OFF'}</b>
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

  const led = LED[salidas.estado];
  // la severidad se recupera del propio registro con una máscara y un desplazamiento
  const severidad = convertirABinario8Bits((salidas.regAct & MASK_SEV) >> SHIFT_SEV).slice(6);

  return (
    <aside className="panel">
      <h1 className="panel-titulo">Invernadero Inteligente</h1>
      <p className="panel-sub">
        Invernaderos de pequeña escala · Ica
        <br />
        Entrada → Procesamiento → Memoria → Salida
      </p>

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
          <span className="arq-nombre">Entradas (RAM)</span>
          <span className="arq-dec">DEC</span>
          <span className="arq-bin">BIN (8 bits)</span>
          <span className="arq-hex">HEX</span>
        </div>
        <FilaArq nombre="VAR_HUM" valor={humedad} />
        <FilaArq nombre="VAR_TEMP" valor={temperatura} />

        <p className="mini-titulo">Memoria persistente (ROM/Flash)</p>
        <FilaArq nombre="UMBRAL_HUM" valor={UMBRAL_HUM} />
        <FilaArq nombre="UMBRAL_TEMP" valor={UMBRAL_TEMP} />

        <p className="mini-titulo">ALU · restas de 8 bits (C = 1 ⇒ préstamo, AVR)</p>
        <FilaALU
          bandera="A = FLAG_TEMP_ALTA"
          operacion="UMBRAL_TEMP − VAR_TEMP"
          minuendo={UMBRAL_TEMP}
          sustraendo={temperatura}
          resta={salidas.restaTemperatura}
        />
        <FilaALU
          bandera="B = FLAG_HUM_BAJA"
          operacion="VAR_HUM − UMBRAL_HUM"
          minuendo={humedad}
          sustraendo={UMBRAL_HUM}
          resta={salidas.restaHumedad}
        />

        <p className="mini-titulo">Registro de salidas REG_ACT (RAM)</p>
        <RegistroRegAct regAct={salidas.regAct} />
        <FilaArq nombre="REG_ACT" valor={salidas.regAct} />
        <p className="sev">
          S₁S₀ = (REG_ACT AND {convertirAHexadecimal(MASK_SEV)}) &gt;&gt; {SHIFT_SEV} = <b>{severidad}</b> · S₁ = A, S₀ = B
        </p>
        <p className="sev">Resaltado: bits que cambiaron (REG_ACT XOR anterior)</p>
      </section>

      {/* ---------------- SALIDA: ESTADO + ACTUADORES ---------------- */}
      <section className="bloque" style={{ '--led': led.color } as CSSProperties}>
        <h2>Salida · Estado del Sistema</h2>
        <div className={`estado${salidas.estado === 'CRITICO' ? ' estado-critico' : ''}`}>
          <b>{NOMBRE_ESTADO[salidas.estado]}</b>
          <span>{describirCausa(salidas.estado, humedad, temperatura)}</span>
        </div>

        <div className="chips">
          <Chip nombre="Bomba de riego" bit={salidas.bombaAgua} />
          <Chip nombre="Ventiladores" bit={salidas.ventiladores} />
          <Chip nombre="Alarma sonora" bit={salidas.alarmaSonora} />
          <div className="chip">
            <span>Indicador LED</span>
            <b className="led">
              <i className="led-punto" />
              {led.nombre}
            </b>
          </div>
        </div>
      </section>

      {/* ---------------- CASOS DE PRUEBA ---------------- */}
      <section className="bloque">
        <h2>
          Matriz de Casos de Prueba · {APROBADOS}/{RESULTADOS_PRUEBA.length} OK
        </h2>
        <p className="nota">Clic en un caso para cargar sus entradas. CP-F: pruebas de frontera.</p>
        <table className="tabla">
          <thead>
            <tr>
              <th>ID</th><th>H%</th><th>T°C</th><th>LED</th><th>REG esp.</th><th>REG real</th><th></th>
            </tr>
          </thead>
          <tbody>
            {RESULTADOS_PRUEBA.map(({ caso, real, ok }) => {
              const activo = caso.humedad === humedad && caso.temperatura === temperatura;
              return (
                <tr
                  key={caso.id}
                  className={`${ok ? 'ok' : 'fail'}${activo ? ' activo' : ''}`}
                  onClick={() => {
                    setHumedad(caso.humedad);
                    setTemperatura(caso.temperatura);
                  }}
                >
                  <td>
                    <button type="button" className="caso">{caso.id}</button>
                  </td>
                  <td>{caso.humedad}</td>
                  <td>{caso.temperatura}</td>
                  <td className="celda-led" style={{ '--led': LED[caso.estado].color } as CSSProperties}>
                    <i className="led-punto" />
                    {LED[caso.estado].nombre}
                  </td>
                  <td>{convertirAHexadecimal(caso.regAct)}</td>
                  <td>{convertirAHexadecimal(real.regAct)}</td>
                  <td className="marca">{ok ? '✔' : '✗'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </aside>
  );
}
