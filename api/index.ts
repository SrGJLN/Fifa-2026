/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { ALL_INITIAL_MATCHES } from '../src/data/worldCupData';
import { calculatePoints } from '../src/utils/scoring';
import { Match, Participant } from '../src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

const isVercel = !!process.env.VERCEL;

// Obtenemos las credenciales directas de la REST API desde las variables de entorno
const UPSTASH_REST_URL = process.env.KV_REST_API_URL;
const UPSTASH_REST_TOKEN = process.env.KV_REST_API_TOKEN;

interface DbStore {
  participants: Participant[];
  officialMatches: Match[];
  officialThirds: string[];
  predictionsClosed?: boolean;
}

// Carga el estado global de la base de datos en la nube (Upstash Redis vía REST HTTP)
async function loadDb(): Promise<DbStore> {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
      throw new Error("Faltan las variables de entorno de Upstash Redis");
    }

    // Petición HTTP GET directa para obtener el estado de la clave 'quiniela_state'
    const response = await fetch(`${UPSTASH_REST_URL}/get/quiniela_state`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`
      }
    });

    const data = await response.json();

    // Upstash devuelve el resultado dentro de la propiedad 'result'
    let store: DbStore | null = null;
    if (data && data.result) {
      store = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
    }

    if (store) {
      let changed = false;

      if (!store.officialMatches || store.officialMatches.length === 0) {
        store.officialMatches = JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES));
        changed = true;
      }
      if (!store.participants) {
        store.participants = [];
        changed = true;
      }
      if (!store.officialThirds) {
        store.officialThirds = [];
        changed = true;
      }
      if (store.predictionsClosed === undefined) {
        store.predictionsClosed = false;
        changed = true;
      }

      // Si hay partidos oficiales, aseguramos que tengan todas las propiedades necesarias
      if (store.officialMatches.length !== ALL_INITIAL_MATCHES.length) {
        const merged: Match[] = [];
        ALL_INITIAL_MATCHES.forEach(initM => {
          const existing = store.officialMatches.find((m: Match) => m.id === initM.id);
          if (existing) {
            merged.push(existing);
          } else {
            merged.push(JSON.parse(JSON.stringify(initM)));
          }
        });
        store.officialMatches = merged;
        changed = true;
      }

      if (changed) {
        await saveDb(store);
      }

      return store;
    }
  } catch (e) {
    console.error("Error leyendo de Upstash Redis, retornando estado limpio", e);
  }

  // Si no hay datos (primera ejecución), inicializamos el estado
  const initial: DbStore = {
    participants: [],
    officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
    officialThirds: [],
    predictionsClosed: false
  };
  await saveDb(initial);
  return initial;
}

// Guarda de forma permanente el estado completo en la nube vía REST HTTP
async function saveDb(store: DbStore) {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
      throw new Error("Faltan las variables de entorno de Upstash Redis");
    }

    // Enviamos el comando SET mediante una petición POST
    await fetch(`${UPSTASH_REST_URL}/set/quiniela_state`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(store)
    });
  } catch (err) {
    console.error("Error escribiendo en Upstash Redis", err);
  }
}

// Recalcula los puntos de todos los participantes basados en los resultados oficiales actuales
function recalculateAllParticipants(store: DbStore) {
  store.participants = store.participants.map(p => {
    const breakdown = calculatePoints(p.groupPicks, store.officialMatches);
    const bracketBreakdown = calculatePoints(p.bracketPicks, store.officialMatches);

    return {
      ...p,
      totalPoints: breakdown.totalPoints + bracketBreakdown.totalPoints,
      exactCount: breakdown.exactCount + bracketBreakdown.exactCount,
      outcomeCount: breakdown.outcomeCount + bracketBreakdown.outcomeCount
    };
  });
}

// ---- API IMPLEMENTATION -----

// Obtener el estado general de la quiniela
app.get('/api/state', async (req, res) => {
  const store = await loadDb();
  res.json({
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    predictionsClosed: store.predictionsClosed || false
  });
});

// Cerrar/Abrir el ingreso de predicciones
app.post('/api/predictions/close', async (req, res) => {
  const { closed } = req.body;
  const store = await loadDb();
  store.predictionsClosed = !!closed;
  await saveDb(store);
  res.json({
    success: true,
    predictionsClosed: store.predictionsClosed
  });
});

// Registrar un nuevo participante con sus predicciones
app.post('/api/predictions', async (req, res) => {
  const { name, groupPicks, bracketPicks, selectedThirds } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'El nombre es obligatorio' });
    return;
  }

  const store = await loadDb();
  if (store.predictionsClosed) {
    res.status(400).json({ error: 'La quiniela está cerrada. No se permiten más predicciones.' });
    return;
  }

  const formattedName = name.trim();
  const id = 'user_' + Math.random().toString(36).substring(2, 11);

  const groupPts = calculatePoints(groupPicks || {}, store.officialMatches);
  const bracketPts = calculatePoints(bracketPicks || {}, store.officialMatches);

  const participant: Participant = {
    id,
    name: formattedName,
    groupPicks: groupPicks || {},
    bracketPicks: bracketPicks || {},
    selectedThirds: selectedThirds || [],
    totalPoints: groupPts.totalPoints + bracketPts.totalPoints,
    exactCount: groupPts.exactCount + bracketPts.exactCount,
    outcomeCount: groupPts.outcomeCount + bracketPts.outcomeCount,
    createdAt: new Date().toISOString()
  };

  store.participants.push(participant);
  await saveDb(store);

  res.json({
    participant,
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds
  });
});

// Actualizar los marcadores oficiales de un partido (Rol Administrador)
app.post('/api/official/update-match', async (req, res) => {
  const { matchId, teamHomeScore, teamAwayScore, completed, winnerId } = req.body;
  if (matchId === undefined) {
    res.status(400).json({ error: 'matchId es obligatorio' });
    return;
  }

  const store = await loadDb();
  const matchIdx = store.officialMatches.findIndex(m => m.id === Number(matchId));

  if (matchIdx === -1) {
    res.status(404).json({ error: 'Partido no encontrado' });
    return;
  }

  const match = store.officialMatches[matchIdx];

  if (completed) {
    match.teamHomeScore = teamHomeScore !== undefined ? Number(teamHomeScore) : undefined;
    match.teamAwayScore = teamAwayScore !== undefined ? Number(teamAwayScore) : undefined;
    match.completed = true;
    if (winnerId) {
      match.winnerId = winnerId;
    } else {
      match.winnerId = undefined;
    }
  } else {
    match.teamHomeScore = undefined;
    match.teamAwayScore = undefined;
    match.completed = false;
    match.winnerId = undefined;
  }

  // Recalculamos la puntuación de todos los jugadores tras el resultado
  recalculateAllParticipants(store);
  await saveDb(store);

  res.json({
    success: true,
    officialMatches: store.officialMatches,
    participants: store.participants,
    officialThirds: store.officialThirds
  });
});

// Actualizar los mejores terceros oficiales
app.post('/api/official/update-thirds', async (req, res) => {
  const { officialThirds } = req.body;
  if (!Array.isArray(officialThirds)) {
    res.status(400).json({ error: 'officialThirds debe ser un arreglo de IDs' });
    return;
  }

  const store = await loadDb();
  store.officialThirds = officialThirds;

  recalculateAllParticipants(store);
  await saveDb(store);

  res.json({
    success: true,
    officialMatches: store.officialMatches,
    participants: store.participants,
    officialThirds: store.officialThirds
  });
});

// Resetear el juego por completo
app.post('/api/reset', async (req, res) => {
  const store = {
    participants: [],
    officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
    officialThirds: [],
    predictionsClosed: false
  };
  await saveDb(store);
  res.json({
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    predictionsClosed: store.predictionsClosed
  });
});

// ---- VITE MIDDLEWARE SETUP -----

async function startServer() {
  if (!isVercel && process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Express Server conectado en http://0.0.0.0:${PORT}`);
    });
  } else {
    // Apuntamos a la carpeta estática dist generada por Vite en la raíz
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    if (!isVercel) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Express Server en producción local: http://0.0.0.0:${PORT}`);
      });
    }
  }
}

startServer();

export default app;