import { useEffect, useRef } from 'react';
import type { Salidas } from './logica';
import { LED, NOMBRE_ESTADO, convertirABinario8Bits, convertirAHexadecimal } from './logica';
import { caminoRR, hexA } from './juego/dibujo';
import { crearEscenario } from './juego/objetos';
import { crearJugador, esTeclaDeMovimiento, moverJugador, posicionesInvernaderos } from './juego/colision';
import { dibujarJugador, dibujarPensamiento, fraseActual } from './juego/animaciones';

// Orquesta el bucle del juego; mapa/decorados en juego/objetos.ts, colisión en juego/colision.ts, operador en juego/animaciones.ts.
// Con una imagen en public/assets/mapa.png y USAR_IMAGEN_MAPA=true, esa imagen reemplaza el suelo generado.

type Props = {
  humedad: number;
  temperatura: number;
  salidas: Salidas;
};

const USAR_IMAGEN_MAPA = false;

export default function Juego({ humedad, temperatura, salidas }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // El bucle de animación se crea una sola vez; para que "vea" siempre
  // los valores más recientes los guardamos en un ref que actualizamos
  // en cada render.
  const datosRef = useRef({ humedad, temperatura, salidas });
  datosRef.current = { humedad, temperatura, salidas };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf = 0;
    const teclas = new Set<string>();
    const jugador = crearJugador();
    const escena = crearEscenario(ctx);

    // imagen opcional del mapa
    let imgMapa: HTMLImageElement | null = null;
    if (USAR_IMAGEN_MAPA) {
      const im = new Image();
      im.onload = () => {
        imgMapa = im;
      };
      im.src = '/assets/mapa.png';
    }

    /* ---------- tamaño del canvas = tamaño real en pantalla ---------- */
    function ajustarTamano() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      if (!jugador.listo) {
        jugador.x = canvas.width / 2;
        jugador.y = canvas.height / 2;
        jugador.listo = true;
      }
    }

    /* ---------- teclado ---------- */
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (esTeclaDeMovimiento(k) || k === 'shift') {
        teclas.add(k);
        if (k !== 'shift') e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      teclas.delete(e.key.toLowerCase());
    };

    /* ---------- un invernadero con sus actuadores ---------- */
    function dibujarInvernadero(
      gx: number,
      gy: number,
      cerca: boolean,
      hum: number,
      temp: number,
      s: Salidas,
    ) {
      const W = 130;
      const H = 92;
      const x = gx - W / 2;
      const y = gy - H / 2;
      const suelo = y + 14;

      // sombra
      ctx!.fillStyle = 'rgba(0,0,0,0.20)';
      ctx!.beginPath();
      ctx!.ellipse(gx, y + H + 6, W / 2 + 4, 12, 0, 0, Math.PI * 2);
      ctx!.fill();

      // interior: tierra + 3 hileras de cultivo
      ctx!.fillStyle = '#5b3f2a';
      ctx!.fillRect(x, suelo, W, H - 14);
      for (let i = 0; i < 3; i++) {
        const ry = suelo + 14 + i * 20;
        ctx!.fillStyle = '#3e2a1b';
        ctx!.fillRect(x + 8, ry + 6, W - 16, 5);
        for (let j = 0; j < 6; j++) {
          const cxp = x + 16 + j * ((W - 32) / 5);
          const sway = Math.sin(frame * 0.05 + i + j) * 1.2;
          ctx!.fillStyle = i === 0 ? '#4caf50' : i === 1 ? '#66bb6a' : '#43a047';
          ctx!.beginPath();
          ctx!.arc(cxp + sway, ry, 4, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // cristal frontal (degradado + reflejo + montantes)
      const gg = ctx!.createLinearGradient(x, suelo, x, y + H);
      gg.addColorStop(0, cerca ? 'rgba(214,244,255,0.5)' : 'rgba(206,236,247,0.4)');
      gg.addColorStop(1, 'rgba(150,205,225,0.26)');
      ctx!.fillStyle = gg;
      ctx!.fillRect(x, suelo, W, H - 14);
      ctx!.fillStyle = 'rgba(255,255,255,0.14)';
      ctx!.beginPath();
      ctx!.moveTo(x + W * 0.15, y + H);
      ctx!.lineTo(x + W * 0.42, suelo);
      ctx!.lineTo(x + W * 0.57, suelo);
      ctx!.lineTo(x + W * 0.3, y + H);
      ctx!.closePath();
      ctx!.fill();
      ctx!.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx!.lineWidth = 1;
      for (let mx = x + 18; mx < x + W; mx += 18) {
        ctx!.beginPath();
        ctx!.moveTo(mx, suelo);
        ctx!.lineTo(mx, y + H);
        ctx!.stroke();
      }
      ctx!.beginPath();
      ctx!.moveTo(x, suelo + (H - 14) / 2);
      ctx!.lineTo(x + W, suelo + (H - 14) / 2);
      ctx!.stroke();

      // techo a dos aguas de cristal
      ctx!.beginPath();
      ctx!.moveTo(x - 6, suelo + 2);
      ctx!.lineTo(gx, y - 14);
      ctx!.lineTo(x + W + 6, suelo + 2);
      ctx!.closePath();
      const gr = ctx!.createLinearGradient(x, y - 14, x, suelo + 2);
      gr.addColorStop(0, 'rgba(224,246,255,0.85)');
      gr.addColorStop(1, 'rgba(168,214,232,0.72)');
      ctx!.fillStyle = gr;
      ctx!.fill();
      ctx!.strokeStyle = '#6f9c86';
      ctx!.lineWidth = 2;
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(gx, y - 14);
      ctx!.lineTo(gx, suelo + 2);
      ctx!.stroke();

      // marco
      ctx!.strokeStyle = cerca ? '#f4c025' : '#5a7f6b';
      ctx!.lineWidth = cerca ? 3 : 2.5;
      ctx!.strokeRect(x, suelo, W, H - 14);

      // puerta
      ctx!.fillStyle = '#6f9c86';
      ctx!.fillRect(gx - 9, y + H - 20, 18, 20);
      ctx!.fillStyle = 'rgba(255,255,255,0.25)';
      ctx!.fillRect(gx - 9, y + H - 20, 18, 4);

      /* ===== ACTUADORES ===== */

      // LED de estado (con resplandor; parpadea en estado crítico)
      const lx = x + 6;
      const ly = y + 22;
      const colorLED = LED[s.estado].color;
      const parpadeo = s.estado === 'ADV_TERMICA' && frame % 40 < 20;
      const glow = ctx!.createRadialGradient(lx + 8, ly + 8, 0, lx + 8, ly + 8, 22);
      glow.addColorStop(0, hexA(colorLED, parpadeo ? 0.05 : 0.5));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(lx + 8, ly + 8, 22, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#22333b';
      caminoRR(ctx!, lx - 2, ly - 2, 20, 20, 3);
      ctx!.fill();
      ctx!.fillStyle = parpadeo ? '#5c1712' : colorLED;
      caminoRR(ctx!, lx, ly, 16, 16, 2);
      ctx!.fill();

      // ventilador: gira solo si ventiladores = 1
      const vx = x + W - 16;
      const vy = y + 28;
      const gira = s.ventiladores === 1;
      ctx!.save();
      ctx!.translate(vx, vy);
      ctx!.fillStyle = '#33404a';
      ctx!.beginPath();
      ctx!.arc(0, 0, 11, 0, Math.PI * 2);
      ctx!.fill();
      if (gira) {
        ctx!.fillStyle = 'rgba(205,225,235,0.25)';
        ctx!.beginPath();
        ctx!.arc(0, 0, 9, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.rotate(gira ? frame * 0.5 : 0.5);
      ctx!.fillStyle = gira ? 'rgba(230,240,245,0.9)' : '#9fb4bf';
      for (let i = 0; i < 3; i++) {
        ctx!.rotate((Math.PI * 2) / 3);
        ctx!.beginPath();
        ctx!.ellipse(5, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.restore();
      ctx!.fillStyle = '#1e2a31';
      ctx!.beginPath();
      ctx!.arc(vx, vy, 2, 0, Math.PI * 2);
      ctx!.fill();

      // riego: tubería + gotas + charco si bombaAgua = 1
      if (s.bombaAgua === 1) {
        ctx!.strokeStyle = '#7f8a93';
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.moveTo(x + 6, y + H);
        ctx!.lineTo(x + W - 6, y + H);
        ctx!.stroke();
        ctx!.fillStyle = '#3aa0ed';
        for (let i = 0; i < 6; i++) {
          const dx = x + 14 + i * ((W - 28) / 5);
          const dy = y + H + ((frame * 3 + i * 11) % 30);
          ctx!.beginPath();
          ctx!.ellipse(dx, dy, 2, 3.4, 0, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = 'rgba(90,170,235,0.35)';
        ctx!.beginPath();
        ctx!.ellipse(gx, y + H + 16, W * 0.4, 5, 0, 0, Math.PI * 2);
        ctx!.fill();
      }

      // alarma: baliza + anillo expansivo si alarmaSonora = 1
      if (s.alarmaSonora === 1) {
        const on = frame % 30 < 15;
        ctx!.fillStyle = on ? '#ff3b30' : '#7a1c17';
        ctx!.beginPath();
        ctx!.arc(gx, y - 14, 4, 0, Math.PI * 2);
        ctx!.fill();
        if (on) {
          const b = ctx!.createRadialGradient(gx, y - 14, 0, gx, y - 14, 26);
          b.addColorStop(0, 'rgba(255,59,48,0.5)');
          b.addColorStop(1, 'rgba(255,59,48,0)');
          ctx!.fillStyle = b;
          ctx!.beginPath();
          ctx!.arc(gx, y - 14, 26, 0, Math.PI * 2);
          ctx!.fill();
        }
        const rr = 24 + (frame % 26);
        ctx!.strokeStyle = `rgba(231,76,60,${1 - (frame % 26) / 26})`;
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.arc(gx, gy, rr, 0, Math.PI * 2);
        ctx!.stroke();
      }

      // etiqueta flotante cuando el operador está cerca
      if (cerca) {
        const bw = 200;
        const bh = 62;
        const bx = Math.min(Math.max(gx - bw / 2, 6), canvas!.width - bw - 6);

        // CORRECCIÓN AQUÍ: Usamos `gy` (el centro del invernadero) en lugar de `y` (la cima del techo).
        // Así, en toda la mitad superior / parte trasera del invernadero, el cartel se enviará abajo.
        const jugadorPorArriba = jugador.y < gy;

        // Si el jugador está en la parte trasera/arriba, el cartel baja
        const by = jugadorPorArriba ? y + H + 18 : y - bh - 16;

        // Cuerpo del resumen técnico
        ctx!.fillStyle = 'rgba(12,20,25,0.92)';
        caminoRR(ctx!, bx, by, bw, bh, 8);
        ctx!.fill();
        ctx!.strokeStyle = '#f4c025';
        ctx!.lineWidth = 1.5;
        caminoRR(ctx!, bx, by, bw, bh, 8);
        ctx!.stroke();

        // Flecha indicadora apuntando correctamente
        ctx!.beginPath();
        if (jugadorPorArriba) {
          // Flecha apuntando hacia arriba (hacia la base del invernadero)
          ctx!.moveTo(gx - 6, by);
          ctx!.lineTo(gx + 6, by);
          ctx!.lineTo(gx, by - 8);
        } else {
          // Flecha apuntando hacia abajo (hacia el techo del invernadero)
          ctx!.moveTo(gx - 6, by + bh);
          ctx!.lineTo(gx + 6, by + bh);
          ctx!.lineTo(gx, by + bh + 8);
        }
        ctx!.closePath();
        ctx!.fillStyle = 'rgba(12,20,25,0.92)';
        ctx!.fill();

        // Texto técnico multibase
        ctx!.fillStyle = '#e8f6ff';
        ctx!.font = '11px ui-monospace, Consolas, monospace';
        ctx!.fillText(
          `TEMP ${temp}C  ${convertirABinario8Bits(temp)}  ${convertirAHexadecimal(temp)}`,
          bx + 10,
          by + 18,
        );
        ctx!.fillText(
          `HUM  ${hum}%  ${convertirABinario8Bits(hum)}  ${convertirAHexadecimal(hum)}`,
          bx + 10,
          by + 34,
        );
        ctx!.fillStyle = colorLED;
        ctx!.fillText(`● ${NOMBRE_ESTADO[s.estado]}`, bx + 10, by + 52);
      }
    }

    /* ---------- ayuda ---------- */
    function dibujarAyuda() {
      if (!canvas) return;

      const texto = 'WASD / Flechas para moverte · Shift para correr · Acércate a inspeccionar';
      const font = '13px system-ui, sans-serif';
      ctx!.font = font;

      // Calcula el ancho exacto del texto + padding lateral
      const paddingX = 16;
      const anchoTexto = ctx!.measureText(texto).width;
      const anchoCaja = anchoTexto + paddingX * 2;
      const altoCaja = 28;
      const posX = 12;
      const posY = canvas.height - 40;

      // Fondo redondeado con ancho dinámico
      ctx!.fillStyle = 'rgba(12,20,25,0.85)';
      caminoRR(ctx!, posX, posY, anchoCaja, altoCaja, 6);
      ctx!.fill();

      // Borde sutil
      ctx!.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx!.lineWidth = 1;
      caminoRR(ctx!, posX, posY, anchoCaja, altoCaja, 6);
      ctx!.stroke();

      // Texto impreso
      ctx!.fillStyle = '#e8f6ff';
      ctx!.font = font;
      ctx!.fillText(texto, posX + paddingX, posY + 18);
    }

    /* ---------- bucle principal ---------- */
    function bucle() {
      if (!canvas) return;
      frame++;
      const invernaderos = posicionesInvernaderos(canvas.width, canvas.height);
      moverJugador(jugador, teclas, canvas.width, canvas.height, invernaderos);
      const { humedad: h, temperatura: t, salidas: s } = datosRef.current;

      // 1. Dibujar suelo y escenario estático (césped, caminos, pozo, etc.)
      escena.dibujarMapa(canvas.width, canvas.height, imgMapa);
      if (!imgMapa) escena.dibujarEscenario(canvas.width, canvas.height, frame);

      let hayCerca = false;

      // 2. Crear una lista de todos los objetos renderizables que tienen profundidad
      type ObjetoDepth = 
        | { tipo: 'invernadero'; y: number; g: Invernadero; cerca: boolean }
        | { tipo: 'jugador'; y: number };

      const objetos: ObjetoDepth[] = [];

      // La base de apoyo en el suelo del invernadero está en g.y + 46
      for (const g of invernaderos) {
        const cerca = Math.hypot(g.x - jugador.x, g.y - jugador.y) < 100;
        if (cerca) hayCerca = true;
        objetos.push({ tipo: 'invernadero', y: g.y + 46, g, cerca });
      }

      // Los pies del jugador están en jugador.y
      objetos.push({ tipo: 'jugador', y: jugador.y });

      // 3. Ordenar por Coordenada Y de menor a mayor (de arriba a abajo en pantalla)
      objetos.sort((a, b) => a.y - b.y);

      // 4. Renderizar en el orden exacto de profundidad
      for (const obj of objetos) {
        if (obj.tipo === 'invernadero') {
          dibujarInvernadero(obj.g.x, obj.g.y, obj.cerca, h, t, s);
        } else {
          dibujarJugador(ctx!, jugador, frame);
        }
      }

      // 5. Dibujar elementos superpuestos (UI, globo de pensamiento y luz ambiental)
      if (hayCerca) {
        dibujarPensamiento(ctx!, canvas.width, jugador.x, jugador.y, fraseActual(s.estado, frame));
      }
      escena.dibujarAmbiente(canvas.width, canvas.height, frame);
      dibujarAyuda();

      raf = requestAnimationFrame(bucle);
    }

    ajustarTamano();
    window.addEventListener('resize', ajustarTamano);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    raf = requestAnimationFrame(bucle);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', ajustarTamano);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return <canvas ref={canvasRef} className="juego-canvas" />;
}
