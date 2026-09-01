import { useState } from 'react';
import Juego from './Juego';
import PanelControl from './PanelControl';
import { evaluarEstadoSistema } from './logica';
import './App.css';

/* App = "placa base": guarda las ENTRADAS en el estado de React,
   llama al PROCESAMIENTO (evaluarEstadoSistema) en cada render y
   reparte los datos al juego (Canvas) y al panel (HUD). */

export default function App() {
  const [humedad, setHumedad] = useState(45); // humedadSuelo (0..100)
  const [temperatura, setTemperatura] = useState(24); // temperaturaAmbiente (0..50)

  // PROCESAMIENTO: se recalcula solo cuando cambia una entrada
  const salidas = evaluarEstadoSistema(humedad, temperatura);

  return (
    <div className="layout">
      <main className="zona-juego">
        <Juego humedad={humedad} temperatura={temperatura} salidas={salidas} />
      </main>

      <PanelControl
        humedad={humedad}
        temperatura={temperatura}
        salidas={salidas}
        setHumedad={setHumedad}
        setTemperatura={setTemperatura}
      />
    </div>
  );
}
