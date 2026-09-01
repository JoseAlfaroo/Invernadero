import { useEffect, useRef } from 'react';
import type { Salidas } from './logica';
import { convertirABinario8Bits, convertirAHexadecimal } from './logica';

/* Videojuego de fondo dibujado en un <canvas>.
   - Mapa con textura de césped, caminos empedrados, árboles, flores,
     una laguna, un pozo, nubes y mariposas (todo generado con Canvas 2D).
   - Un operador con animación de caminata en 4 direcciones.
   - 3 invernaderos cuyos actuadores (LED, ventilador, riego, alarma)
     reaccionan en vivo al estado calculado por la lógica.
   Si colocas una imagen en public/assets/mapa.png y pones
   USAR_IMAGEN_MAPA = true, esa imagen se usa como suelo. */

type Props = {
  humedad: number;
  temperatura: number;
  salidas: Salidas;
};

const USAR_IMAGEN_MAPA = false;

const COLOR_LED: Record<1 | 2 | 3, string> = {
  1: '#2ecc71', // verde
  2: '#f1c40f', // amarillo
  3: '#e74c3c', // rojo
};

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
    const jugador = { x: 0, y: 0, listo: false, dir: 'abajo', fase: 0, moviendo: false };

    /* ---------- utilidades de dibujo ---------- */

    // rectángulo con esquinas redondeadas (sirve para cualquier contexto)
    function caminoRR(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
      const rr = Math.max(0, Math.min(r, w / 2, h / 2));
      g.beginPath();
      g.moveTo(x + rr, y);
      g.arcTo(x + w, y, x + w, y + h, rr);
      g.arcTo(x + w, y + h, x, y + h, rr);
      g.arcTo(x, y + h, x, y, rr);
      g.arcTo(x, y, x + w, y, rr);
      g.closePath();
    }

    // "#rrggbb" -> "rgba(r,g,b,a)"
    function hexA(h: string, a: number) {
      const n = parseInt(h.slice(1), 16);
      return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
    }

    /* ---------- texturas (se generan una sola vez) ---------- */

    function crearPatronCesped(): CanvasPattern | null {
      const c = document.createElement('canvas');
      c.width = 140;
      c.height = 140;
      const g = c.getContext('2d');
      if (!g) return null;
      g.fillStyle = '#6cba4d';
      g.fillRect(0, 0, 140, 140);
      let s = 987654321 >>> 0;
      const rnd = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
      for (let i = 0; i < 110; i++) {
        g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,55,0,0.07)';
        const w = rnd() * 12 + 3;
        g.fillRect(rnd() * 140, rnd() * 140, w, w * 0.55);
      }
      for (let i = 0; i < 80; i++) {
        const x = rnd() * 140;
        const y = rnd() * 140;
        g.strokeStyle = rnd() > 0.5 ? '#549f38' : '#83d060';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd() * 2 - 1), y - 3 - rnd() * 2);
        g.stroke();
      }
      return ctx!.createPattern(c, 'repeat');
    }

    function crearPatronCamino(): CanvasPattern | null {
      const c = document.createElement('canvas');
      c.width = 120;
      c.height = 120;
      const g = c.getContext('2d');
      if (!g) return null;
      g.fillStyle = '#8b7d66';
      g.fillRect(0, 0, 120, 120);
      let s = 13572468 >>> 0;
      const rnd = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
      for (let i = 0; i < 32; i++) {
        const x = rnd() * 120;
        const y = rnd() * 120;
        const w = rnd() * 16 + 12;
        const h = rnd() * 12 + 9;
        caminoRR(g, x, y, w, h, 4);
        const tono = 150 + Math.floor(rnd() * 40);
        g.fillStyle = `rgb(${tono}, ${tono - 12}, ${tono - 30})`;
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.22)';
        g.lineWidth = 1;
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.12)';
        g.fillRect(x + 2, y + 2, w * 0.4, 2);
      }
      return ctx!.createPattern(c, 'repeat');
    }

    const patronCesped = crearPatronCesped();
    const patronCamino = crearPatronCamino();

    // flores fijas (posición en fracción 0..1 del canvas)
    const flores: { fx: number; fy: number; c: string }[] = [];
    {
      let s = 424242 >>> 0;
      const rnd = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
      const cols = ['#f6c744', '#ef6f6c', '#ffffff', '#c98bdb', '#5ec8e0'];
      for (let i = 0; i < 46; i++) {
        flores.push({ fx: rnd(), fy: rnd(), c: cols[Math.floor(rnd() * cols.length)] });
      }
    }

    const nubes = [
      { x: 0.1, y: 0.12, v: 0.0007, w: 70 },
      { x: 0.55, y: 0.06, v: 0.0005, w: 92 },
      { x: 0.82, y: 0.2, v: 0.0009, w: 58 },
    ];
    const mariposas = [
      { bx: 0.35, by: 0.55, c: '#f7d774' },
      { bx: 0.7, by: 0.4, c: '#ef8fb0' },
      { bx: 0.5, by: 0.82, c: '#9ad7ee' },
    ];

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
    const TECLAS_MOV = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'];
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (TECLAS_MOV.includes(k)) {
        teclas.add(k);
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => teclas.delete(e.key.toLowerCase());

    /* ---------- e) moverJugador: teclas -> nueva posición ---------- */
    function moverJugador() {
      if (!canvas) return;
      const v = 1.8; // velocidad reducida un 40% respecto a la versión anterior (era 3)
      let dx = 0;
      let dy = 0;
      if (teclas.has('arrowup') || teclas.has('w')) dy -= v;
      if (teclas.has('arrowdown') || teclas.has('s')) dy += v;
      if (teclas.has('arrowleft') || teclas.has('a')) dx -= v;
      if (teclas.has('arrowright') || teclas.has('d')) dx += v;
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071; // diagonal a la misma velocidad
        dy *= 0.7071;
      }

      jugador.moviendo = dx !== 0 || dy !== 0;
      if (jugador.moviendo) {
        jugador.fase += 0.28; // avanza el ciclo de caminata
        if (Math.abs(dx) >= Math.abs(dy)) jugador.dir = dx < 0 ? 'izq' : 'der';
        else jugador.dir = dy < 0 ? 'arriba' : 'abajo';
      }
      jugador.x = Math.max(20, Math.min(canvas.width - 20, jugador.x + dx));
      jugador.y = Math.max(40, Math.min(canvas.height - 12, jugador.y + dy));
    }

    /* ---------- posición de los 3 invernaderos ---------- */
    function invernaderos() {
      if (!canvas) return [];
      return [
        { x: canvas.width * 0.24, y: canvas.height * 0.32 },
        { x: canvas.width * 0.62, y: canvas.height * 0.24 },
        { x: canvas.width * 0.4, y: canvas.height * 0.72 },
      ];
    }

    /* ---------- suelo: imagen o césped + caminos ---------- */
    function dibujarMapa() {
      if (!canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      if (imgMapa) {
        ctx!.drawImage(imgMapa, 0, 0, W, H);
        return;
      }
      ctx!.fillStyle = patronCesped ?? '#6cba4d';
      ctx!.fillRect(0, 0, W, H);
      ctx!.fillStyle = patronCamino ?? '#8b7d66';
      const b = 30;
      ctx!.fillRect(0, 0, W, b);
      ctx!.fillRect(0, H - b, W, b);
      ctx!.fillRect(0, 0, b, H);
      ctx!.fillRect(W - b, 0, b, H);
      ctx!.fillRect(0, H / 2 - 26, W, 52);
      ctx!.fillRect(W / 2 - 26, 0, 52, H);
      ctx!.strokeStyle = 'rgba(0,0,0,0.14)';
      ctx!.lineWidth = 2;
      ctx!.strokeRect(1, H / 2 - 26, W - 2, 52);
      ctx!.strokeRect(W / 2 - 26, 1, 52, H - 2);
    }

    /* ---------- decorados del mapa ---------- */
    function dibujarArbol(x: number, y: number, e: number) {
      const sway = Math.sin(frame * 0.015 + x * 0.05) * 2 * e;
      ctx!.fillStyle = 'rgba(0,0,0,0.18)';
      ctx!.beginPath();
      ctx!.ellipse(x, y + 2, 20 * e, 7 * e, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#6b4a2e';
      caminoRR(ctx!, x - 4 * e, y - 16 * e, 8 * e, 18 * e, 2);
      ctx!.fill();
      ctx!.fillStyle = 'rgba(0,0,0,0.15)';
      caminoRR(ctx!, x, y - 16 * e, 4 * e, 18 * e, 2);
      ctx!.fill();
      ctx!.fillStyle = '#3f7d3a';
      ctx!.beginPath();
      ctx!.arc(x + sway, y - 26 * e, 16 * e, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#4f9a45';
      ctx!.beginPath();
      ctx!.arc(x - 7 * e + sway, y - 22 * e, 12 * e, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#62b45a';
      ctx!.beginPath();
      ctx!.arc(x + 7 * e + sway, y - 29 * e, 11 * e, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = 'rgba(255,255,255,0.14)';
      ctx!.beginPath();
      ctx!.arc(x + 3 * e + sway, y - 33 * e, 5 * e, 0, Math.PI * 2);
      ctx!.fill();
    }

    function dibujarLaguna(x: number, y: number) {
      ctx!.fillStyle = '#356fa8';
      ctx!.beginPath();
      ctx!.ellipse(x, y, 52, 30, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#4a8fca';
      ctx!.beginPath();
      ctx!.ellipse(x, y, 44, 24, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#63a9e0';
      ctx!.beginPath();
      ctx!.ellipse(x, y + 1, 36, 18, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx!.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const ox = Math.sin(frame * 0.03 + i * 2) * 10;
        ctx!.beginPath();
        ctx!.arc(x + ox - 8 + i * 8, y - 4 + i * 6, 6, 0.9, 2.2);
        ctx!.stroke();
      }
      ctx!.strokeStyle = '#3c7a3a';
      ctx!.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const rx = x - 40 + i * 20;
        ctx!.beginPath();
        ctx!.moveTo(rx, y - 22);
        ctx!.lineTo(rx + Math.sin(frame * 0.05 + i) * 2, y - 34);
        ctx!.stroke();
      }
    }

    function dibujarPozo(x: number, y: number) {
      ctx!.fillStyle = 'rgba(0,0,0,0.20)';
      ctx!.beginPath();
      ctx!.ellipse(x, y + 8, 20, 7, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#8d8d92';
      ctx!.beginPath();
      ctx!.ellipse(x, y, 16, 10, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#6f6f75';
      ctx!.beginPath();
      ctx!.ellipse(x, y, 11, 6.5, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#2f6f8f';
      ctx!.beginPath();
      ctx!.ellipse(x, y, 8, 4.5, 0, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.arc(x, y, 4 + (frame % 40) / 12, 0.9, 2.2);
      ctx!.stroke();
      ctx!.strokeStyle = '#6b4a2e';
      ctx!.lineWidth = 3;
      ctx!.beginPath();
      ctx!.moveTo(x - 12, y - 2);
      ctx!.lineTo(x - 12, y - 22);
      ctx!.moveTo(x + 12, y - 2);
      ctx!.lineTo(x + 12, y - 22);
      ctx!.stroke();
      ctx!.fillStyle = '#7a4a2c';
      ctx!.beginPath();
      ctx!.moveTo(x - 18, y - 20);
      ctx!.lineTo(x, y - 32);
      ctx!.lineTo(x + 18, y - 20);
      ctx!.closePath();
      ctx!.fill();
    }

    function dibujarEscenario() {
      if (!canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      for (const fl of flores) {
        const fx = fl.fx * W;
        const fy = fl.fy * H;
        if (Math.abs(fy - H / 2) < 30 || Math.abs(fx - W / 2) < 30) continue;
        ctx!.fillStyle = fl.c;
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2;
          ctx!.beginPath();
          ctx!.ellipse(fx + Math.cos(a) * 2.4, fy + Math.sin(a) * 2.4, 1.7, 1.7, 0, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.fillStyle = '#f7e04a';
        ctx!.beginPath();
        ctx!.arc(fx, fy, 1.4, 0, Math.PI * 2);
        ctx!.fill();
      }
      dibujarLaguna(W * 0.13, H * 0.85);
      dibujarPozo(W * 0.6, H * 0.56);
      const arb = [
        [0.05, 0.1, 1.1],
        [0.94, 0.08, 1.2],
        [0.965, 0.52, 1.0],
        [0.035, 0.55, 0.95],
        [0.9, 0.92, 1.15],
        [0.5, 0.045, 0.9],
        [0.19, 0.94, 1.0],
      ];
      for (const [ax, ay, ae] of arb) dibujarArbol(ax * W, ay * H, ae);
    }

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

      // LED de estado (con resplandor; parpadea en rojo)
      const lx = x + 6;
      const ly = y + 22;
      const parpadeo = s.estadoLuzLED === 3 && frame % 40 < 20;
      const glow = ctx!.createRadialGradient(lx + 8, ly + 8, 0, lx + 8, ly + 8, 22);
      glow.addColorStop(0, hexA(COLOR_LED[s.estadoLuzLED], parpadeo ? 0.05 : 0.5));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(lx + 8, ly + 8, 22, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = '#22333b';
      caminoRR(ctx!, lx - 2, ly - 2, 20, 20, 3);
      ctx!.fill();
      ctx!.fillStyle = parpadeo ? '#5c1712' : COLOR_LED[s.estadoLuzLED];
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
        const by = y - bh - 16;
        ctx!.fillStyle = 'rgba(12,20,25,0.92)';
        caminoRR(ctx!, bx, by, bw, bh, 8);
        ctx!.fill();
        ctx!.strokeStyle = '#f4c025';
        ctx!.lineWidth = 1.5;
        caminoRR(ctx!, bx, by, bw, bh, 8);
        ctx!.stroke();
        ctx!.beginPath();
        ctx!.moveTo(gx - 6, by + bh);
        ctx!.lineTo(gx + 6, by + bh);
        ctx!.lineTo(gx, by + bh + 8);
        ctx!.closePath();
        ctx!.fillStyle = 'rgba(12,20,25,0.92)';
        ctx!.fill();
        ctx!.fillStyle = '#e8f6ff';
        ctx!.font = '11px ui-monospace, Consolas, monospace';
        ctx!.fillText(`TEMP ${temp}C  ${convertirABinario8Bits(temp)}  ${convertirAHexadecimal(temp)}`, bx + 10, by + 18);
        ctx!.fillText(`HUM  ${hum}%  ${convertirABinario8Bits(hum)}  ${convertirAHexadecimal(hum)}`, bx + 10, by + 34);
        ctx!.fillStyle = COLOR_LED[s.estadoLuzLED];
        ctx!.fillText(`● ${s.estado}`, bx + 10, by + 52);
      }
    }

    /* ---------- operador con animación de caminata ---------- */
    function dibujarJugador() {
      const px = jugador.x;
      const py = jugador.y;
      const mov = jugador.moviendo;
      const f = jugador.fase;
      const sw = mov ? Math.sin(f) : 0; // balanceo de brazos/piernas
      const bob = mov ? Math.abs(Math.sin(f)) * 1.8 : Math.sin(frame * 0.05) * 0.6;

      const footY = py;
      const hipY = py - 13;
      const shoulderY = py - 26 - bob * 0.5;
      const headY = py - 36 - bob * 0.6;

      const PIEL = '#f0c8a4';
      const PIEL_S = '#d9ae86';
      const PELO = '#553824';
      const CAMISA = '#3f7d5a';
      const CAMISA_S = '#2f5f45';
      const PANT = '#3b4a63';
      const BOTA = '#4a3320';
      const PAJA = '#dcb75f';
      const PAJA_S = '#b88f42';

      // sombra
      ctx!.fillStyle = 'rgba(0,0,0,0.22)';
      ctx!.beginPath();
      ctx!.ellipse(px, footY, 12, 4.5, 0, 0, Math.PI * 2);
      ctx!.fill();

      // dibuja una extremidad como línea gruesa redondeada
      const capsula = (x1: number, y1: number, x2: number, y2: number, w: number, color: string) => {
        ctx!.strokeStyle = color;
        ctx!.lineWidth = w;
        ctx!.lineCap = 'round';
        ctx!.beginPath();
        ctx!.moveTo(x1, y1);
        ctx!.lineTo(x2, y2);
        ctx!.stroke();
      };

      if (jugador.dir === 'izq' || jugador.dir === 'der') {
        const fl = jugador.dir === 'izq' ? -1 : 1;
        capsula(px - 2 * fl, hipY, px - 3 * fl - sw * 5 * fl, footY, 6, PANT); // pierna trasera
        capsula(px, shoulderY + 2, px - 2 * fl - sw * 6 * fl, shoulderY + 13, 5, CAMISA_S); // brazo trasero
        ctx!.fillStyle = CAMISA; // torso
        caminoRR(ctx!, px - 7, shoulderY, 14, hipY - shoulderY + 3, 5);
        ctx!.fill();
        capsula(px + 2 * fl, hipY, px + 3 * fl + sw * 5 * fl, footY, 6, PANT); // pierna delantera
        ctx!.fillStyle = BOTA;
        ctx!.beginPath();
        ctx!.ellipse(px + 3 * fl + sw * 5 * fl + fl, footY, 4, 2.5, 0, 0, Math.PI * 2);
        ctx!.fill();
        capsula(px, shoulderY + 2, px + 3 * fl + sw * 6 * fl, shoulderY + 13, 5, CAMISA); // brazo delantero
        ctx!.fillStyle = PIEL;
        ctx!.beginPath();
        ctx!.arc(px + 3 * fl + sw * 6 * fl, shoulderY + 14, 2.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = PIEL; // cabeza
        ctx!.beginPath();
        ctx!.arc(px + fl, headY, 7, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = PELO;
        ctx!.beginPath();
        ctx!.arc(px + fl, headY - 2, 7, Math.PI * 0.9, Math.PI * 2.1);
        ctx!.fill();
        ctx!.fillStyle = '#2b2b2b'; // ojo
        ctx!.beginPath();
        ctx!.arc(px + 4 * fl, headY - 1, 1.1, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = PIEL_S; // nariz
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(px + 6 * fl, headY);
        ctx!.lineTo(px + 7.5 * fl, headY + 1.5);
        ctx!.stroke();
        ctx!.fillStyle = PAJA; // sombrero
        ctx!.beginPath();
        ctx!.ellipse(px + fl, headY - 4, 11, 4, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = PAJA_S;
        ctx!.beginPath();
        ctx!.ellipse(px + fl, headY - 5, 6, 4.5, 0, Math.PI, Math.PI * 2);
        ctx!.fill();
      } else {
        const atras = jugador.dir === 'arriba';
        capsula(px - 4, hipY, px - 4 + sw * 4, footY, 6, PANT); // piernas
        capsula(px + 4, hipY, px + 4 - sw * 4, footY, 6, PANT);
        ctx!.fillStyle = BOTA;
        ctx!.beginPath();
        ctx!.ellipse(px - 4 + sw * 4, footY, 4, 2.5, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.ellipse(px + 4 - sw * 4, footY, 4, 2.5, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = CAMISA; // torso
        caminoRR(ctx!, px - 9, shoulderY, 18, hipY - shoulderY + 3, 5);
        ctx!.fill();
        ctx!.fillStyle = CAMISA_S;
        caminoRR(ctx!, px + 3, shoulderY, 6, hipY - shoulderY + 3, 3);
        ctx!.fill();
        capsula(px - 9, shoulderY + 1, px - 10 - sw * 4, shoulderY + 13, 5, CAMISA); // brazos
        capsula(px + 9, shoulderY + 1, px + 10 + sw * 4, shoulderY + 13, 5, CAMISA);
        ctx!.fillStyle = PIEL;
        ctx!.beginPath();
        ctx!.arc(px - 10 - sw * 4, shoulderY + 14, 2.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(px + 10 + sw * 4, shoulderY + 14, 2.4, 0, Math.PI * 2);
        ctx!.fill();
        if (atras) {
          ctx!.fillStyle = '#8a6b47'; // mochila
          caminoRR(ctx!, px - 7, shoulderY + 2, 14, 12, 3);
          ctx!.fill();
        }
        ctx!.fillStyle = PIEL; // cabeza
        ctx!.beginPath();
        ctx!.arc(px, headY, 7, 0, Math.PI * 2);
        ctx!.fill();
        if (atras) {
          ctx!.fillStyle = PELO;
          ctx!.beginPath();
          ctx!.arc(px, headY, 7, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          ctx!.fillStyle = PELO;
          ctx!.beginPath();
          ctx!.arc(px, headY - 2, 7, Math.PI, Math.PI * 2);
          ctx!.fill();
          ctx!.fillStyle = '#2b2b2b'; // ojos
          ctx!.beginPath();
          ctx!.arc(px - 2.6, headY, 1.1, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.beginPath();
          ctx!.arc(px + 2.6, headY, 1.1, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.strokeStyle = PIEL_S; // sonrisa
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(px, headY + 2, 2, Math.PI * 0.15, Math.PI * 0.85);
          ctx!.stroke();
        }
        ctx!.fillStyle = PAJA; // sombrero de paja
        ctx!.beginPath();
        ctx!.ellipse(px, headY - 4, 12, 4.5, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = PAJA_S;
        ctx!.beginPath();
        ctx!.ellipse(px, headY - 6, 6.5, 5, 0, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    /* ---------- nubes, mariposas y luz ambiental ---------- */
    function dibujarAmbiente() {
      if (!canvas) return;
      const W = canvas.width;
      const H = canvas.height;
      for (const n of nubes) {
        n.x += n.v;
        if (n.x > 1.25) n.x = -0.25;
        const cx = n.x * W;
        const cy = n.y * H;
        ctx!.fillStyle = 'rgba(0,0,0,0.05)';
        ctx!.beginPath();
        ctx!.ellipse(cx + 24, cy + 70, n.w, n.w * 0.4, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = 'rgba(255,255,255,0.75)';
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, n.w, n.w * 0.5, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.ellipse(cx + n.w * 0.6, cy + 6, n.w * 0.6, n.w * 0.4, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.ellipse(cx - n.w * 0.6, cy + 8, n.w * 0.55, n.w * 0.35, 0, 0, Math.PI * 2);
        ctx!.fill();
      }
      for (let i = 0; i < mariposas.length; i++) {
        const m = mariposas[i];
        const mx = m.bx * W + Math.sin(frame * 0.02 + i * 2) * 45;
        const my = m.by * H + Math.cos(frame * 0.03 + i) * 28;
        const flap = Math.abs(Math.sin(frame * 0.4 + i)) * 3 + 1;
        ctx!.fillStyle = m.c;
        ctx!.beginPath();
        ctx!.ellipse(mx - 2, my, flap, 2.5, -0.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.beginPath();
        ctx!.ellipse(mx + 2, my, flap, 2.5, 0.4, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.fillStyle = '#3a2a1a';
        ctx!.fillRect(mx - 0.5, my - 2, 1, 4);
      }
      const g = ctx!.createRadialGradient(W * 0.5, H * 0.28, 0, W * 0.5, H * 0.28, Math.max(W, H) * 0.85);
      g.addColorStop(0, 'rgba(255,240,205,0.10)');
      g.addColorStop(1, 'rgba(4,10,26,0.22)');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);
    }

    /* ---------- ayuda ---------- */
    function dibujarAyuda() {
      if (!canvas) return;
      ctx!.fillStyle = 'rgba(12,20,25,0.78)';
      caminoRR(ctx!, 12, canvas.height - 42, 470, 28, 6);
      ctx!.fill();
      ctx!.fillStyle = '#e8f6ff';
      ctx!.font = '13px system-ui, sans-serif';
      ctx!.fillText('Muévete con WASD / Flechas · Acércate a un invernadero para inspeccionarlo', 24, canvas.height - 23);
    }

    /* ---------- bucle principal ---------- */
    function bucle() {
      if (!canvas) return;
      frame++;
      moverJugador();
      const { humedad: h, temperatura: t, salidas: s } = datosRef.current;
      dibujarMapa();
      if (!imgMapa) dibujarEscenario();
      for (const g of invernaderos()) {
        const cerca = Math.hypot(g.x - jugador.x, g.y - jugador.y) < 100;
        dibujarInvernadero(g.x, g.y, cerca, h, t, s);
      }
      dibujarJugador();
      dibujarAmbiente();
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
