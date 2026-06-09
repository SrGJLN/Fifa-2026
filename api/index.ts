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

// Credenciales de la REST API desde las variables de entorno
const UPSTASH_REST_URL = process.env.KV_REST_API_URL;
const UPSTASH_REST_TOKEN = process.env.KV_REST_API_TOKEN;

interface DbStore {
  participants: Participant[];
  officialMatches: Match[];
  officialThirds: string[];
  predictionsClosed?: boolean;
}

// Carga el estado global estructurado desde Upstash Redis
async function loadDb(): Promise<DbStore> {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
      throw new Error("Faltan las variables de entorno de Upstash Redis");
    }

    // 1. Traer los participantes usando HGETALL
    const resParticipants = await fetch(`${UPSTASH_REST_URL}/hgetall/quiniela_participants`, {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
    });
    const dataParticipants = await resParticipants.json();

    let participants: Participant[] = [];
    if (dataParticipants && dataParticipants.result) {
      const pairs = dataParticipants.result;
      for (let i = 0; i < pairs.length; i += 2) {
        try {
          participants.push(typeof pairs[i + 1] === 'string' ? JSON.parse(pairs[i + 1]) : pairs[i + 1]);
        } catch (e) {
          console.error("Error parseando participante", e);
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
    console.error("Error leyendo de Upstash", e);
    return {
      participants: [],
      officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
      officialThirds: [],
      predictionsClosed: false
    };
  }
}

// Guarda de manera permanente los datos globales de configuración
async function saveDb(store: DbStore) {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return;

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
    console.error("Error escribiendo configuración", err);
  }
}

// Recalcula los puntos de todos los participantes
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

// Actualiza masivamente a los participantes de forma segura uno por uno
async function saveAllParticipantsAtomic(participants: Participant[]) {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return;
    for (const p of participants) {
      await fetch(`${UPSTASH_REST_URL}/hset/quiniela_participants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ [p.id]: p })
      });
    }
  } catch (err) {
    console.error("Error actualizando participantes", err);
  }
}

// ---- API IMPLEMENTATION -----

app.get('/api/state', async (req, res) => {
  const store = await loadDb();
  res.json({
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    predictionsClosed: store.predictionsClosed || false
  });
});

app.post('/api/predictions/close', async (req, res) => {
  const { closed } = req.body;
  const store = await loadDb();
  store.predictionsClosed = !!closed;
  await saveDb(store);
  res.json({ success: true, predictionsClosed: store.predictionsClosed });
});

// Registrar un nuevo participante (Formato de Objeto Limpio - Cuelgue solucionado)
app.post('/api/predictions', async (req, res) => {
  const { name, groupPicks, bracketPicks, selectedThirds } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'El nombre es obligatorio' });
    return;
  }

  const store = await loadDb();
  if (store.predictionsClosed) {
    res.status(400).json({ error: 'La quiniela está cerrada.' });
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

  // Enviamos a /hset pasando un objeto clave:valor { id: datos }. ¡Esto es instantáneo!
  await fetch(`${UPSTASH_REST_URL}/hset/quiniela_participants`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ [id]: participant })
  });

  const updatedStore = await loadDb();

  res.json({
    participant,
    participants: updatedStore.participants,
    officialMatches: updatedStore.officialMatches,
    officialThirds: updatedStore.officialThirds
  });
});

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
    match.winnerId = winnerId || undefined;
  } else {
    match.teamHomeScore = undefined;
    match.teamAwayScore = undefined;
    match.completed = false;
    match.winnerId = undefined;
  }

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

app.post('/api/official/update-thirds', async (req, res) => {
  const { officialThirds } = req.body;
  if (!Array.isArray(officialThirds)) {
    res.status(400).json({ error: 'officialThirds debe ser un arreglo' });
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

// Reseteo limpio de claves
app.post('/api/reset', async (req, res) => {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    res.status(500).json({ error: 'Credenciales ausentes' });
    return;
  }

  await fetch(`${UPSTASH_REST_URL}/del/quiniela_participants`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
  });
  await fetch(`${UPSTASH_REST_URL}/del/quiniela_config`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
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
  }
}

startServer();

export default app;