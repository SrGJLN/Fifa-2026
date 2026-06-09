import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    fetch('/api/state')
      .then(res => res.json())
      .then(data => setParticipants(data.participants || []));
  }, []);

  const handleSavePrediction = async (predictionData: any) => {
    const response = await fetch('/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(predictionData),
    });

    const data = await response.json();

    // Aquí actualizamos el estado con la lista completa que devuelve el servidor
    if (data.participants) {
      setParticipants(data.participants);
    }
    alert("Predicción guardada.");
  };

  return (
    <div className="App">
      {/* Aquí va el resto de tu interfaz, asegúrate de pasar handleSavePrediction a tus componentes */}
      <h1>Quiniela Mundial</h1>
      {/* ... */}
    </div>
  );
}

export default App;
