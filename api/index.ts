/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { Redis } from '@upstash/redis';
import { ALL_INITIAL_MATCHES } from '../src/data/worldCupData.js';
import { calculatePoints } from '../src/utils/scoring.js';
import { Match, Participant } from '../src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

const isVercel = !!process.env.VERCEL;

// Soporte bivalente para variables de Vercel KV o Upstash Directo
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

if (!url || !token) {
  console.error("⚠️ CRÍTICO: No se detectaron las variables de entorno de Upstash / Vercel KV.");
}

// Inicializamos el cliente oficial del SDK
const redis = new Redis({ url, token });

interface DbStore {
  participants: Participant[];
  officialMatches: Match[];
  officialThirds: string[];
  predictionsClosed?: boolean;
}

// Carga el estado global de forma nativa y segura
async function loadDb(): Promise<DbStore> {
  try {
    // 1. Traer todos los participantes del Hash
    const allParticipantsObj = await redis.hgetall<Record<string, any>>('quiniela_participants');

    let participants: Participant[] = [];
    if (allParticipantsObj) {
      for (const key in allParticipantsObj) {
        const p = allParticipantsObj[key];
        participants.push(typeof p === 'string' ? JSON.parse(p) : p);
      }
    }

    // 2. Traer la configuración general de partidos
    const config = await redis.get<any>('quiniela_config');

    if (!config) {
      const initialConfig = {
        officialMatches: ALL_INITIAL_MATCHES,
        officialThirds: [],
        predictionsClosed: false
      };
      await redis.set('quiniela_config', initialConfig);
      return {
        participants,
        officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
        officialThirds: [],
        predictionsClosed: false
      };
    }

    return {
      participants,
      officialMatches: config.officialMatches || JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
      officialThirds: config.officialThirds || [],
      predictionsClosed: config.predictionsClosed || false
    };

  } catch (e) {
    console.error("Error leyendo de Upstash Redis:", e);
    return {
      participants: [],
      officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
      officialThirds: [],
      predictionsClosed: false
    };
  }
}

// Guarda los datos globales de configuración
async function saveDb(store: DbStore) {
  try {
    const config = {
      officialMatches: store.officialMatches,
      officialThirds: store.officialThirds,
      predictionsClosed: store.predictionsClosed
    };
    await redis.set('quiniela_config', config);
  } catch (err) {
    console.error("Error escribiendo configuración:", err);
  }
}

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

async function saveAllParticipantsAtomic(participants: Participant[]) {
  try {
    for (const p of participants) {
      await redis.hset('quiniela_participants', { [p.id]: p });
    }
  } catch (err) {
    console.error("Error actualizando participantes:", err);
  }
}

// ---- API ENDPOINTS -----

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

  // HSET ultra veloz usando el SDK nativo
  await redis.hset('quiniela_participants', { [id]: participant });

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

app.post('/api/reset', async (req, res) => {
  await redis.del('quiniela_participants');
  await redis.del('quiniela_config');
  res.json({
    participants: [],
    officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
    officialThirds: [],
    predictionsClosed: false
  });
});

// ---- VITE SETUP -----
async function startServer() {
  if (!isVercel && process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0");
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