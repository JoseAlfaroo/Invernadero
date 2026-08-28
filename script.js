const personaje = document.getElementById('personaje');
const lienzo = document.getElementById('lienzo-simulacion');
const obstaculos = document.querySelectorAll('.obstaculo');

let posX = 240;
let posY = 200;
const VELOCIDAD = 6;
const TAMANO_PERSONAJE = 32;

personaje.style.left = posX + 'px';
personaje.style.top = posY + 'px';

function verificarColision(nuevoX, nuevoY) {
  const rectPersonaje = {
    left: nuevoX,
    right: nuevoX + TAMANO_PERSONAJE,
    top: nuevoY,
    bottom: nuevoY + TAMANO_PERSONAJE
  };

  if (
    rectPersonaje.left < 0 ||
    rectPersonaje.right > lienzo.clientWidth ||
    rectPersonaje.top < 0 ||
    rectPersonaje.bottom > lienzo.clientHeight
  ) {
    return true;
  }

  for (let obs of obstaculos) {
    const obsLeft = obs.offsetLeft;
    const obsRight = obs.offsetLeft + obs.offsetWidth;
    const obsTop = obs.offsetTop;
    const obsBottom = obs.offsetTop + obs.offsetHeight;

    const hayColision = !(
      rectPersonaje.right <= obsLeft ||
      rectPersonaje.left >= obsRight ||
      rectPersonaje.bottom <= obsTop ||
      rectPersonaje.top >= obsBottom
    );

    if (hayColision) return true;
  }

  return false;
}

function moverJugador(direccion) {
  let siguienteX = posX;
  let siguienteY = posY;

  switch (direccion) {
    case 'Arriba':
      siguienteY -= VELOCIDAD;
      break;
    case 'Abajo':
      siguienteY += VELOCIDAD;
      break;
    case 'Izquierda':
      siguienteX -= VELOCIDAD;
      break;
    case 'Derecha':
      siguienteX += VELOCIDAD;
      break;
  }

  if (!verificarColision(siguienteX, siguienteY)) {
    posX = siguienteX;
    posY = siguienteY;
    personaje.style.left = posX + 'px';
    personaje.style.top = posY + 'px';
  }
}

// CONTROLES
window.addEventListener('keydown', (e) => {
  const tecla = e.key.toLowerCase();

  if (tecla === 'arrowup' || tecla === 'w') {
    moverJugador('Arriba');
    e.preventDefault();
  } else if (tecla === 'arrowdown' || tecla === 's') {
    moverJugador('Abajo');
    e.preventDefault();
  } else if (tecla === 'arrowleft' || tecla === 'a') {
    moverJugador('Izquierda');
    e.preventDefault();
  } else if (tecla === 'arrowright' || tecla === 'd') {
    moverJugador('Derecha');
    e.preventDefault();
  }
});