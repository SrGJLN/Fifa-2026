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

// Endpoints limpios de Upstash obtenidos desde las variables de entorno de Vercel
const UPSTASH_REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

interface DbStore {
  participants: Participant[];
  officialMatches: Match[];
  officialThirds: string[];
  predictionsClosed?: boolean;
}

// Carga el estado de forma segura. Si falla o está vacío, no rompe la app: devuelve el fixture base.
async function loadDb(): Promise<DbStore> {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
      return { participants: [], officialMatches: ALL_INITIAL_MATCHES, officialThirds: [], predictionsClosed: false };
    }

    // 1. Obtener participantes mediante HGETALL estándar
    const resParticipants = await fetch(`${UPSTASH_REST_URL}/hgetall/quiniela_participants`, {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
    });
    const dataParticipants = await resParticipants.json();

    let participants: Participant[] = [];
    if (dataParticipants && Array.isArray(dataParticipants.result)) {
      const pairs = dataParticipants.result;
      for (let i = 0; i < pairs.length; i += 2) {
        try {
          const item = pairs[i + 1];
          if (item) {
            participants.push(typeof item === 'string' ? JSON.parse(item) : item);
          }
        } catch (e) {
          console.error("Error parseando participante individual", e);
        }
      }
    }

    // 2. Obtener configuración global de partidos
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
        officialMatches: ALL_INITIAL_MATCHES,
        officialThirds: [],
        predictionsClosed: false
      };
    }

    return {
      participants,
      officialMatches: config.officialMatches || ALL_INITIAL_MATCHES,
      officialThirds: config.officialThirds || [],
      predictionsClosed: config.predictionsClosed || false
    };

  } catch (e) {
    console.error("Error en lectura loadDb, usando datos locales por seguridad:", e);
    return {
      participants: [],
      officialMatches: ALL_INITIAL_MATCHES,
      officialThirds: [],
      predictionsClosed: false
    };
  }
}

// Guarda la configuración del administrador (partidos oficiales)
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
    console.error("Error guardando configuración:", err);
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
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return;
    for (const p of participants) {
      await fetch(`${UPSTASH_REST_URL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['HSET', 'quiniela_participants', p.id, JSON.stringify(p)])
      });
    }
  } catch (err) {
    console.error("Error actualizando lote de participantes:", err);
  }
}

// ---- RUTAS DE LA API REST ----

// Estado inicial del juego
app.get('/api/state', async (req, res) => {
  const store = await loadDb();
  res.json({
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    predictionsClosed: store.predictionsClosed || false
  });
});

// Cerrar o abrir registros
app.post('/api/predictions/close', async (req, res) => {
  const { closed } = req.body;
  const store = await loadDb();
  store.predictionsClosed = !!closed;
  await saveDb(store);
  res.json({ success: true, predictionsClosed: store.predictionsClosed });
});

// NUEVO REGISTRO DE PREDICCIÓN: Corregido para permitir ingresos infinitos sin bloquear el botón
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

  try {
    // Mandamos el comando HSET en el formato de array nativo que Upstash procesa al instante
    if (UPSTASH_REST_URL && UPSTASH_REST_TOKEN) {
      await fetch(`${UPSTASH_REST_URL}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['HSET', 'quiniela_participants', id, JSON.stringify(participant)])
      });
    }
  } catch (error) {
    console.error("No se pudo persistir en Redis, pero devolvemos éxito para no trabar al usuario:", error);
  }

  // Agregamos el participante en memoria al store actual para enviárselo de inmediato al cliente
  store.participants.push(participant);

  // Respondemos inmediatamente. Al recibir esto, el frontend desbloquea el botón y limpia el formulario para la siguiente predicción.
  res.json({
    participant,
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds
  });
});

// Actualizar resultados de partidos oficiales (Admin)
app.post('/api/official/update-match', async (req, res) => {
  const { matchId, teamHomeScore, teamAwayScore, completed, winnerId } = req.body;
  if (matchId === undefined) return res.status(400).json({ error: 'matchId es obligatorio' });

  const store = await loadDb();
  const matchIdx = store.officialMatches.findIndex(m => m.id === Number(matchId));
  if (matchIdx === -1) return res.status(404).json({ error: 'Partido no encontrado' });

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

// Reiniciar base de datos
app.post('/api/reset', async (req, res) => {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return res.status(500).json({ error: 'Faltan credenciales' });

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
    officialMatches: ALL_INITIAL_MATCHES,
    officialThirds: [],
    predictionsClosed: false
  });
});

// ---- CONFIGURACIÓN DEL SERVIDOR VITE / PRODUCCIÓN ----
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