/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { ALL_INITIAL_MATCHES } from './src/data/worldCupData';
import { calculatePoints } from './src/utils/scoring';
import { Match, Participant } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

const isVercel = !!process.env.VERCEL;
const DB_DIR = isVercel ? '/tmp' : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure db directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface DbStore {
  participants: Participant[];
  officialMatches: Match[];
  officialThirds: string[];
  predictionsClosed?: boolean;
}

function loadDb(): DbStore {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      
      let changed = false;
      if (!parsed.officialMatches || parsed.officialMatches.length === 0) {
        parsed.officialMatches = JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES));
        changed = true;
      }
      if (!parsed.participants) {
        parsed.participants = [];
        changed = true;
      }
      if (!parsed.officialThirds) {
        parsed.officialThirds = [];
        changed = true;
      }
      if (parsed.predictionsClosed === undefined) {
        parsed.predictionsClosed = false;
        changed = true;
      }
      
      // If there are official matches, ensure they have all necessary properties from ALL_INITIAL_MATCHES
      if (parsed.officialMatches.length !== ALL_INITIAL_MATCHES.length) {
        // Safe merge: keep edited matches but fill others
        const merged: Match[] = [];
        ALL_INITIAL_MATCHES.forEach(initM => {
          const existing = parsed.officialMatches.find((m: Match) => m.id === initM.id);
          if (existing) {
            merged.push(existing);
          } else {
            merged.push(JSON.parse(JSON.stringify(initM)));
          }
        });
        parsed.officialMatches = merged;
        changed = true;
      }

      if (changed) {
        saveDb(parsed);
      }

      return parsed;
    } catch (e) {
      console.error("Error reading db.json, returning clean state", e);
    }
  }

  const initial: DbStore = {
    participants: [],
    officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
    officialThirds: [],
    predictionsClosed: false
  };
  saveDb(initial);
  return initial;
}

function saveDb(store: DbStore) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing to db.json", err);
  }
}

// Recalculates points for all participants based on the current official matches list
function recalculateAllParticipants(store: DbStore) {
  store.participants = store.participants.map(p => {
    const breakdown = calculatePoints(p.groupPicks, store.officialMatches);
    // Also calculate points from bracket picks
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

// Get overall state (loaded lazily)
app.get('/api/state', (req, res) => {
  const store = loadDb();
  res.json({
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    predictionsClosed: store.predictionsClosed || false
  });
});

// Toggle predictions closed/open
app.post('/api/predictions/close', (req, res) => {
  const { closed } = req.body;
  const store = loadDb();
  store.predictionsClosed = !!closed;
  saveDb(store);
  res.json({
    success: true,
    predictionsClosed: store.predictionsClosed
  });
});

// Create/Upload a new prediction / prediction set (user details)
app.post('/api/predictions', (req, res) => {
  const { name, groupPicks, bracketPicks, selectedThirds } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    res.status(400).json({ error: 'El nombre es obligatorio' });
    return;
  }

  const store = loadDb();
  if (store.predictionsClosed) {
    res.status(400).json({ error: 'La quiniela está cerrada. No se permiten más predicciones.' });
    return;
  }

  const formattedName = name.trim();
  const id = 'user_' + Math.random().toString(36).substring(2, 11);

  // Initial calculation of scores based on official results
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
  saveDb(store);

  res.json({
    participant,
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds
  });
});

// Update a specific match's official scores (Admin role)
app.post('/api/official/update-match', (req, res) => {
  const { matchId, teamHomeScore, teamAwayScore, completed, winnerId } = req.body;
  if (matchId === undefined) {
    res.status(400).json({ error: 'matchId es obligatorio' });
    return;
  }

  const store = loadDb();
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

  // Recalculate scores for everyone
  recalculateAllParticipants(store);
  saveDb(store);

  res.json({
    success: true,
    officialMatches: store.officialMatches,
    participants: store.participants,
    officialThirds: store.officialThirds
  });
});

// Update the official 8 best thirds
app.post('/api/official/update-thirds', (req, res) => {
  const { officialThirds } = req.body;
  if (!Array.isArray(officialThirds)) {
    res.status(400).json({ error: 'officialThirds debe ser un arreglo de IDs' });
    return;
  }

  const store = loadDb();
  store.officialThirds = officialThirds;

  // Recalculate everyone
  recalculateAllParticipants(store);
  saveDb(store);

  res.json({
    success: true,
    officialMatches: store.officialMatches,
    participants: store.participants,
    officialThirds: store.officialThirds
  });
});

// Reset the game completely (clears participants but retains match structure, or fully resets matches)
app.post('/api/reset', (req, res) => {
  const store = {
    participants: [],
    officialMatches: JSON.parse(JSON.stringify(ALL_INITIAL_MATCHES)),
    officialThirds: [],
    predictionsClosed: false
  };
  saveDb(store);
  res.json({
    participants: store.participants,
    officialMatches: store.officialMatches,
    officialThirds: store.officialThirds,
    predictionsClosed: store.predictionsClosed
  });
});

// ---- VITE MIDDLEWARE SETUP -----

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Server connected on http://0.0.0.0:${PORT}`);
  });
}

if (!isVercel) {
  startServer();
}

export default app;
