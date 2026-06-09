/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { ALL_INITIAL_MATCHES } from '../src/data/worldCupData.js';
import { calculatePoints } from '../src/utils/scoring.js';
import { Match, Participant } from '../src/types.js';

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

// Carga el estado global estructurado de forma segura desde Upstash Redis
async function loadDb(): Promise<DbStore> {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
      throw new Error("Faltan las variables de entorno de Upstash Redis");
    }

    // 1. Traer los participantes usando HGETALL con la sintaxis de la URL limpia de Upstash
    const resParticipants = await fetch(`${UPSTASH_REST_URL}/hgetall/quiniela_participants`, {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
    });
    const dataParticipants = await resParticipants.json();

    let participants: Participant[] = [];
    if (dataParticipants && dataParticipants.result) {
      // Upstash HGETALL devuelve un array plano de parejas [key, value, key, value...]
      const pairs = dataParticipants.result;
      for (let i = 0; i < pairs.length; i += 2) {
        try {
          participants.push(JSON.parse(pairs[i + 1]));
        } catch (e) {
          console.error("Error parseando participante individual", e);
        }
      }
    }

    // 2. Traer la configuración de partidos oficiales y estado del candado
    const resConfig = await fetch(`${UPSTASH_REST_URL}/get/quiniela_config`, {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
    });
    const dataConfig = await resConfig.json();

    let config: any = null;
    if (dataConfig && dataConfig.result) {
      config = typeof dataConfig.result === 'string' ? JSON.parse(dataConfig.result) : dataConfig.result;
    }

    // Si es la primera ejecución o no hay configuración, la inicializamos
    if (!config) {
      config = {
        officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
        officialThirds: [],
        predictionsClosed: false
      };

      await fetch(`${UPSTASH_REST_URL}/set/quiniela_config`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    }

    return {
      participants,
      officialMatches: config.officialMatches || JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
      officialThirds: config.officialThirds || [],
      predictionsClosed: config.predictionsClosed || false
    };

  } catch (e) {
    console.error("Error leyendo de Upstash Redis de forma atómica", e);
    return {
      participants: [],
      officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
      officialThirds: [],
      predictionsClosed: false
    };
  }
}

// Guarda de manera permanente los datos globales de configuración (partidos y candado)
async function saveDb(store: DbStore) {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
      throw new Error("Faltan las variables de entorno de Upstash Redis");
    }

    const config = {
      officialMatches: store.officialMatches,
      officialThirds: store.officialThirds,
      predictionsClosed: store.predictionsClosed
    };

    await fetch(`${UPSTASH_REST_URL}/set/quiniela_config`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

  } catch (err) {
    console.error("Error escribiendo configuración en Upstash", err);
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

// Actualiza de forma masiva los datos de los participantes usando el formato REST de arreglo seguro
async function saveAllParticipantsAtomic(participants: Participant[]) {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return;

    for (const p of participants) {
      await fetch(`${UPSTASH_REST_URL}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([
          'HSET',
          'quiniela_participants',
          p.id,
          JSON.stringify(p)
        ])
      });
    }
  } catch (err) {
    console.error("Error actualizando participantes en lote", err);
  }
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

// Registrar un nuevo participante de forma atómica sin causar bloqueos (Timeout Fix)
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

  // Enviamos el comando HSET estructurado como un arreglo en la raíz de Upstash REST (Solución al cuelgue)
  await fetch(`${UPSTASH_REST_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      'HSET',
      'quiniela_participants',
      id,
      JSON.stringify(participant)
    ])
  });

  // Releemos de inmediato el estado consolidado para actualizar la UI del cliente
  const updatedStore = await loadDb();

  res.json({
    participant,
    participants: updatedStore.participants,
    officialMatches: updatedStore.officialMatches,
    officialThirds: updatedStore.officialThirds
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

  // Recalculamos los nuevos puntajes de toda la lista basada en el partido modificado
  recalculateAllParticipants(store);

  // Guardamos los cambios de los partidos y persistimos los nuevos puntajes individuales
  await saveDb(store);
  await saveAllParticipantsAtomic(store.participants);

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
  await saveAllParticipantsAtomic(store.participants);

  res.json({
    success: true,
    officialMatches: store.officialMatches,
    participants: store.participants,
    officialThirds: store.officialThirds
  });
});

// Resetear el juego por completo (Elimina las estructuras de Upstash)
app.post('/api/reset', async (req, res) => {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    res.status(500).json({ error: 'Credenciales ausentes' });
    return;
  }

  // Eliminamos las dos claves usando comandos nativos REST en el cuerpo
  await fetch(`${UPSTASH_REST_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['DEL', 'quiniela_participants'])
  });

  await fetch(`${UPSTASH_REST_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['DEL', 'quiniela_config'])
  });

  res.json({
    participants: [],
    officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
    officialThirds: [],
    predictionsClosed: false
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