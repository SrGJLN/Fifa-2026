/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { ALL_INITIAL_MATCHES } from '../src/data/worldCupData.js';
import { calculatePoints } from '../src/utils/scoring.js';
import { Match, Participant, ActivePhase } from '../src/types.js';

const app = express();
const PORT = 3000;

app.use(express.json());

const isVercel = !!process.env.VERCEL;

const UPSTASH_REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

interface DbStore {
  participants: Participant[];
  officialMatches: Match[];
  officialThirds: string[];
  predictionsClosed?: boolean;
  activePhase?: ActivePhase;
}

async function loadDb(): Promise<DbStore> {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
      return { participants: [], officialMatches: ALL_INITIAL_MATCHES, officialThirds: [], predictionsClosed: false, activePhase: 'group' };
    }

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
        predictionsClosed: false,
        activePhase: 'group'
      };
    }

    return {
      participants,
      officialMatches: config.officialMatches || ALL_INITIAL_MATCHES,
      officialThirds: config.officialThirds || [],
      predictionsClosed: config.predictionsClosed || false,
      activePhase: config.activePhase || 'group'
    };

  } catch (e) {
    console.error("Error en lectura loadDb:", e);
    return {
      participants: [],
      officialMatches: ALL_INITIAL_MATCHES,
      officialThirds: [],
      predictionsClosed: false,
      activePhase: 'group'
    };
  }
}

async function saveDb(store: DbStore) {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return;
    const config = {
      officialMatches: store.officialMatches,
      officialThirds: store.officialThirds,
      predictionsClosed: store.predictionsClosed,
      activePhase: store.activePhase
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

function calcAllPoints(p: Participant, officialMatches: Match[]) {
  const groupMatches = officialMatches.filter(m => m.stage === 'group');
  const bracketMatches = officialMatches.filter(m => m.stage !== 'group');
  const groupPts = calculatePoints(p.groupPicks, groupMatches);
  const bracketPts = calculatePoints(p.bracketPicks, bracketMatches);
  return {
    totalPoints: groupPts.totalPoints + bracketPts.totalPoints,
    exactCount: groupPts.exactCount + bracketPts.exactCount,
    outcomeCount: groupPts.outcomeCount + bracketPts.outcomeCount
  };
}

function recalculateAllParticipants(store: DbStore) {
  store.participants = store.participants.map(p => {
    const pts = calcAllPoints(p, store.officialMatches);
    return { ...p, ...pts };
  });
}

async function saveParticipant(participant: Participant) {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return;
    await fetch(`${UPSTASH_REST_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['HSET', 'quiniela_participants', participant.id, JSON.stringify(participant)]
      ])
    });
  } catch (err) {
    console.error("Error guardando participante:", err);
  }
}

async function saveAllParticipantsAtomic(participants: Participant[]) {
  try {
    if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return;
    for (const p of participants) {
      await fetch(`${UPSTASH_REST_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['HSET', 'quiniela_participants', p.id, JSON.stringify(p)]
        ])
      });
    }
  } catch (err) {
    console.error("Error actualizando lote de participantes:", err);
  }
}

// ---- RUTAS DE LA API REST ----

app.get('/api/state', async (req, res) => {
  const store = await loadDb();
  res.json({
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    predictionsClosed: store.predictionsClosed || false,
    activePhase: store.activePhase || 'group'
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

  const groupMatches = store.officialMatches.filter(m => m.stage === 'group');
  const bracketMatches = store.officialMatches.filter(m => m.stage !== 'group');
  const groupPts = calculatePoints(groupPicks || {}, groupMatches);
  const bracketPts = calculatePoints(bracketPicks || {}, bracketMatches);

  const participant: Participant = {
    id,
    name: formattedName,
    groupPicks: groupPicks || {},
    bracketPicks: bracketPicks || {},
    selectedThirds: selectedThirds || [],
    totalPoints: groupPts.totalPoints + bracketPts.totalPoints,
    exactCount: groupPts.exactCount + bracketPts.exactCount,
    outcomeCount: groupPts.outcomeCount + bracketPts.outcomeCount,
    createdAt: new Date().toISOString(),
    completedPhases: ['group']
  };

  try {
    if (UPSTASH_REST_URL && UPSTASH_REST_TOKEN) {
      const upstashRes = await fetch(`${UPSTASH_REST_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          ['HSET', 'quiniela_participants', id, JSON.stringify(participant)]
        ])
      });
      const upstashData = await upstashRes.json();
      console.log('Respuesta Upstash HSET:', JSON.stringify(upstashData));
    }
  } catch (error) {
    console.error("No se pudo persistir en Redis:", error);
  }

  store.participants.push(participant);

  res.json({
    participant,
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    activePhase: store.activePhase || 'group'
  });
});

app.post('/api/predictions/:id/bracket', async (req, res) => {
  const { id } = req.params;
  const { bracketPicks, selectedThirds, phase } = req.body;

  if (!phase) {
    res.status(400).json({ error: 'La fase es obligatoria' });
    return;
  }

  const store = await loadDb();

  if (store.predictionsClosed) {
    res.status(400).json({ error: 'La quiniela está cerrada.' });
    return;
  }

  const participantIdx = store.participants.findIndex(p => p.id === id);
  if (participantIdx === -1) {
    res.status(404).json({ error: 'Participante no encontrado' });
    return;
  }

  const p = store.participants[participantIdx];

  if (p.completedPhases?.includes(phase)) {
    res.status(400).json({ error: 'Ya completaste las predicciones de esta fase.' });
    return;
  }

  const updatedBracketPicks = {
    ...p.bracketPicks,
    ...(bracketPicks || {})
  };

  const updatedSelectedThirds = selectedThirds || p.selectedThirds;
  const updatedP = { ...p, bracketPicks: updatedBracketPicks };
  const pts = calcAllPoints(updatedP, store.officialMatches);

  const updatedParticipant: Participant = {
    ...p,
    bracketPicks: updatedBracketPicks,
    selectedThirds: updatedSelectedThirds,
    totalPoints: pts.totalPoints,
    exactCount: pts.exactCount,
    outcomeCount: pts.outcomeCount,
    completedPhases: [...(p.completedPhases || ['group']), phase]
  };

  store.participants[participantIdx] = updatedParticipant;
  await saveParticipant(updatedParticipant);

  res.json({
    participant: updatedParticipant,
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    activePhase: store.activePhase || 'group'
  });
});

app.post('/api/advance-phase', async (req, res) => {
  const { phase } = req.body;

  const validPhases: ActivePhase[] = ['group', 'r32', 'r16', 'qf', 'sf', 'final'];
  if (!phase || !validPhases.includes(phase)) {
    res.status(400).json({ error: 'Fase inválida' });
    return;
  }

  const store = await loadDb();
  store.activePhase = phase;
  store.predictionsClosed = false;
  await saveDb(store);

  res.json({
    success: true,
    activePhase: store.activePhase,
    predictionsClosed: store.predictionsClosed,
    participants: store.participants
  });
});

app.post('/api/official/update-match', async (req, res) => {
  const { matchId, teamHomeScore, teamAwayScore, completed, winnerId, penaltyHomeScore, penaltyAwayScore } = req.body;
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

    const isDrawn = match.teamHomeScore !== undefined && match.teamAwayScore !== undefined
      && match.teamHomeScore === match.teamAwayScore;

    if (isDrawn && penaltyHomeScore !== undefined && penaltyAwayScore !== undefined) {
      match.penaltyHomeScore = Number(penaltyHomeScore);
      match.penaltyAwayScore = Number(penaltyAwayScore);
      if (!match.winnerId) {
        match.winnerId = Number(penaltyHomeScore) > Number(penaltyAwayScore)
          ? match.teamHomeId
          : match.teamAwayId;
      }
    } else {
      match.penaltyHomeScore = undefined;
      match.penaltyAwayScore = undefined;
    }
  } else {
    match.teamHomeScore = undefined;
    match.teamAwayScore = undefined;
    match.completed = false;
    match.winnerId = undefined;
    match.penaltyHomeScore = undefined;
    match.penaltyAwayScore = undefined;
  }

  recalculateAllParticipants(store);
  await saveDb(store);
  await saveAllParticipantsAtomic(store.participants);

  res.json({
    success: true,
    officialMatches: store.officialMatches,
    participants: store.participants,
    officialThirds: store.officialThirds,
    activePhase: store.activePhase || 'group'
  });
});

app.post('/api/official/update-thirds', async (req, res) => {
  const { officialThirds } = req.body;
  const store = await loadDb();
  store.officialThirds = officialThirds || [];
  await saveDb(store);

  res.json({
    success: true,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    participants: store.participants,
    activePhase: store.activePhase || 'group'
  });
});

// Actualizar fixture de una fase específica sin borrar resultados
app.post('/api/update-fixture', async (req, res) => {
  const store = await loadDb();

  const newR16 = ALL_INITIAL_MATCHES.filter(m => m.stage === 'r16');
  const newQF = ALL_INITIAL_MATCHES.filter(m => m.stage === 'qf');

  store.officialMatches = store.officialMatches.map(m => {
    if (m.stage === 'r16') {
      const newMatch = newR16.find(nm => nm.id === m.id);
      if (newMatch) {
        return {
          ...newMatch,
          teamHomeScore: m.teamHomeScore,
          teamAwayScore: m.teamAwayScore,
          completed: m.completed,
          winnerId: m.winnerId,
          penaltyHomeScore: m.penaltyHomeScore,
          penaltyAwayScore: m.penaltyAwayScore
        };
      }
    }
    if (m.stage === 'qf') {
      const newMatch = newQF.find(nm => nm.id === m.id);
      if (newMatch) {
        return {
          ...newMatch,
          teamHomeScore: m.teamHomeScore,
          teamAwayScore: m.teamAwayScore,
          completed: m.completed,
          winnerId: m.winnerId,
          penaltyHomeScore: m.penaltyHomeScore,
          penaltyAwayScore: m.penaltyAwayScore
        };
      }
    }
    return m;
  });

  await saveDb(store);

  res.json({
    success: true,
    officialMatches: store.officialMatches
  });
});

app.post('/api/recalculate', async (req, res) => {
  const store = await loadDb();
  recalculateAllParticipants(store);
  await saveAllParticipantsAtomic(store.participants);
  res.json({
    success: true,
    participants: store.participants
  });
});

app.post('/api/reset', async (req, res) => {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) return res.status(500).json({ error: 'Faltan credenciales' });

  await fetch(`${UPSTASH_REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['DEL', 'quiniela_participants']])
  });

  await fetch(`${UPSTASH_REST_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['DEL', 'quiniela_config']])
  });

  res.json({
    participants: [],
    officialMatches: ALL_INITIAL_MATCHES,
    officialThirds: [],
    predictionsClosed: false,
    activePhase: 'group'
  });
});

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