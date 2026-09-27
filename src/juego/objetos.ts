// Suelo, decorados fijos y ambiente animado del mapa; crearEscenario(ctx) arma texturas/datos una sola vez.

import { caminoRR } from './dibujo';

function crearPatronCesped(ctx: CanvasRenderingContext2D): CanvasPattern | null {
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
  return ctx.createPattern(c, 'repeat');
}

function crearPatronCamino(ctx: CanvasRenderingContext2D): CanvasPattern | null {
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
  return ctx.createPattern(c, 'repeat');
}

export function crearEscenario(ctx: CanvasRenderingContext2D) {
  const patronCesped = crearPatronCesped(ctx);
  const patronCamino = crearPatronCamino(ctx);

  // flores fijas, posición en fracción 0..1 del canvas
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

  // posiciones fijas (fracción 0..1) que evitan caminos e invernaderos
  const rocas = [
    { fx: 0.09, fy: 0.42, e: 1 },
    { fx: 0.87, fy: 0.62, e: 0.85 },
    { fx: 0.55, fy: 0.9, e: 1.1 },
    { fx: 0.3, fy: 0.06, e: 0.9 },
  ];
  const arbustos = [
    { fx: 0.13, fy: 0.22, e: 1 },
    { fx: 0.35, fy: 0.9, e: 0.9 },
    { fx: 0.78, fy: 0.4, e: 1 },
    { fx: 0.92, fy: 0.14, e: 0.85 },
    { fx: 0.55, fy: 0.62, e: 0.95 },
    { fx: 0.2, fy: 0.65, e: 1 },
  ];
  const faroles = [
    { fx: 0.02, fy: 0.5 },
    { fx: 0.98, fy: 0.5 },
    { fx: 0.5, fy: 0.02 },
  ];

  const arboles: { fx: number; fy: number; e: number }[] = [
    // Parcela Superior Izquierda
    { fx: 0.05, fy: 0.1, e: 1.1 },
    { fx: 0.44, fy: 0.08, e: 0.95 },
    { fx: 0.06, fy: 0.44, e: 1.0 },

    // Parcela Superior Derecha
    { fx: 0.94, fy: 0.08, e: 1.2 },
    { fx: 0.54, fy: 0.07, e: 0.9 },
    { fx: 0.93, fy: 0.42, e: 1.05 },

    // Parcela Inferior Izquierda (alrededor de la laguna)
    { fx: 0.04, fy: 0.68, e: 1.1 },
    { fx: 0.22, fy: 0.92, e: 0.95 },

    // Parcela Inferior Derecha
    { fx: 0.88, fy: 0.88, e: 1.15 },
    { fx: 0.95, fy: 0.65, e: 1.0 },
    { fx: 0.56, fy: 0.91, e: 0.9 },
  ];

  // suelo: imagen o césped + caminos
  function dibujarMapa(width: number, height: number, imgMapa: HTMLImageElement | null) {
    if (imgMapa) {
      ctx.drawImage(imgMapa, 0, 0, width, height);
      return;
    }
    ctx.fillStyle = patronCesped ?? '#6cba4d';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = patronCamino ?? '#8b7d66';
    const b = 30;
    ctx.fillRect(0, 0, width, b);
    ctx.fillRect(0, height - b, width, b);
    ctx.fillRect(0, 0, b, height);
    ctx.fillRect(width - b, 0, b, height);
    ctx.fillRect(0, height / 2 - 26, width, 52);
    ctx.fillRect(width / 2 - 26, 0, 52, height);
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, height / 2 - 26, width - 2, 52);
    ctx.strokeRect(width / 2 - 26, 1, 52, height - 2);
  }

  function dibujarArbol(x: number, y: number, e: number, frame: number) {
    const sway = Math.sin(frame * 0.015 + x * 0.05) * 2 * e;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 20 * e, 7 * e, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b4a2e';
    caminoRR(ctx, x - 4 * e, y - 16 * e, 8 * e, 18 * e, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    caminoRR(ctx, x, y - 16 * e, 4 * e, 18 * e, 2);
    ctx.fill();
    ctx.fillStyle = '#3f7d3a';
    ctx.beginPath();
    ctx.arc(x + sway, y - 26 * e, 16 * e, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4f9a45';
    ctx.beginPath();
    ctx.arc(x - 7 * e + sway, y - 22 * e, 12 * e, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#62b45a';
    ctx.beginPath();
    ctx.arc(x + 7 * e + sway, y - 29 * e, 11 * e, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.arc(x + 3 * e + sway, y - 33 * e, 5 * e, 0, Math.PI * 2);
    ctx.fill();
  }

  function dibujarLaguna(x: number, y: number, frame: number) {
    ctx.fillStyle = '#356fa8';
    ctx.beginPath();
    ctx.ellipse(x, y, 52, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4a8fca';
    ctx.beginPath();
    ctx.ellipse(x, y, 44, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#63a9e0';
    ctx.beginPath();
    ctx.ellipse(x, y + 1, 36, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const ox = Math.sin(frame * 0.03 + i * 2) * 10;
      ctx.beginPath();
      ctx.arc(x + ox - 8 + i * 8, y - 4 + i * 6, 6, 0.9, 2.2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#3c7a3a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const rx = x - 40 + i * 20;
      ctx.beginPath();
      ctx.moveTo(rx, y - 22);
      ctx.lineTo(rx + Math.sin(frame * 0.05 + i) * 2, y - 34);
      ctx.stroke();
    }
  }

  function dibujarPozo(x: number, y: number, frame: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8d8d92';
    ctx.beginPath();
    ctx.ellipse(x, y, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6f6f75';
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f6f8f';
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 4 + (frame % 40) / 12, 0.9, 2.2);
    ctx.stroke();
    ctx.strokeStyle = '#6b4a2e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 2);
    ctx.lineTo(x - 12, y - 22);
    ctx.moveTo(x + 12, y - 2);
    ctx.lineTo(x + 12, y - 22);
    ctx.stroke();
    ctx.fillStyle = '#7a4a2c';
    ctx.beginPath();
    ctx.moveTo(x - 18, y - 20);
    ctx.lineTo(x, y - 32);
    ctx.lineTo(x + 18, y - 20);
    ctx.closePath();
    ctx.fill();
  }

  function dibujarRoca(x: number, y: number, e: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4 * e, 9 * e, 3 * e, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a8f97';
    ctx.beginPath();
    ctx.ellipse(x, y, 8 * e, 5 * e, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a4aab2';
    ctx.beginPath();
    ctx.ellipse(x - 2 * e, y - 1.5 * e, 4 * e, 2.4 * e, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, 8 * e, 5 * e, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function dibujarArbusto(x: number, y: number, e: number, frame: number) {
    const sway = Math.sin(frame * 0.02 + x * 0.03) * 1.2 * e;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x, y + 4 * e, 13 * e, 4 * e, 0, 0, Math.PI * 2);
    ctx.fill();
    const bolas: [number, number, number, string][] = [
      [-6 * e, 0, 8 * e, '#438a3e'],
      [6 * e, 0, 8 * e, '#438a3e'],
      [0, -4 * e, 9 * e, '#54a24b'],
    ];
    for (const [ox, oy, r, c] of bolas) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x + ox + sway, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(x - 2 * e + sway, y - 7 * e, 3 * e, 0, Math.PI * 2);
    ctx.fill();
  }

  function dibujarFarol(x: number, y: number, frame: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a3f46';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 34);
    ctx.stroke();
    const brillo = 0.6 + Math.sin(frame * 0.06) * 0.15;
    const glow = ctx.createRadialGradient(x, y - 40, 0, x, y - 40, 20);
    glow.addColorStop(0, `rgba(255,224,150,${brillo})`);
    glow.addColorStop(1, 'rgba(255,224,150,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 40, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f343a';
    caminoRR(ctx, x - 6, y - 48, 12, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#ffe096';
    ctx.beginPath();
    ctx.arc(x, y - 40, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // decorados del mapa: laguna, pozo, rocas, arbustos, farolas, árboles y flores
  function dibujarEscenario(width: number, height: number, frame: number) {
    for (const fl of flores) {
      const fx = fl.fx * width;
      const fy = fl.fy * height;
      if (Math.abs(fy - height / 2) < 30 || Math.abs(fx - width / 2) < 30) continue;
      ctx.fillStyle = fl.c;
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(fx + Math.cos(a) * 2.4, fy + Math.sin(a) * 2.4, 1.7, 1.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f7e04a';
      ctx.beginPath();
      ctx.arc(fx, fy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    dibujarLaguna(width * 0.13, height * 0.85, frame);
    dibujarPozo(width * 0.6, height * 0.56, frame);
    for (const r of rocas) dibujarRoca(r.fx * width, r.fy * height, r.e);
    for (const a of arbustos) dibujarArbusto(a.fx * width, a.fy * height, a.e, frame);
    for (const f of faroles) dibujarFarol(f.fx * width, f.fy * height, frame);
    for (const a of arboles) dibujarArbol(a.fx * width, a.fy * height, a.e, frame);
  }

  // nubes, mariposas y luz ambiental
  function dibujarAmbiente(width: number, height: number, frame: number) {
    for (const n of nubes) {
      n.x += n.v;
      if (n.x > 1.25) n.x = -0.25;
      const cx = n.x * width;
      const cy = n.y * height;
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.beginPath();
      ctx.ellipse(cx + 24, cy + 70, n.w, n.w * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, n.w, n.w * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + n.w * 0.6, cy + 6, n.w * 0.6, n.w * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - n.w * 0.6, cy + 8, n.w * 0.55, n.w * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < mariposas.length; i++) {
      const m = mariposas[i];
      const mx = m.bx * width + Math.sin(frame * 0.02 + i * 2) * 45;
      const my = m.by * height + Math.cos(frame * 0.03 + i) * 28;
      const flap = Math.abs(Math.sin(frame * 0.4 + i)) * 3 + 1;
      ctx.fillStyle = m.c;
      ctx.beginPath();
      ctx.ellipse(mx - 2, my, flap, 2.5, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(mx + 2, my, flap, 2.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(mx - 0.5, my - 2, 1, 4);
    }
    const g = ctx.createRadialGradient(width * 0.5, height * 0.28, 0, width * 0.5, height * 0.28, Math.max(width, height) * 0.85);
    g.addColorStop(0, 'rgba(255,240,205,0.10)');
    g.addColorStop(1, 'rgba(4,10,26,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
  }

  return { dibujarMapa, dibujarEscenario, dibujarAmbiente };
}
