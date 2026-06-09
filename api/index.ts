/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import express from 'express';
import { ALL_INITIAL_MATCHES } from '../src/data/worldCupData.js';
import { Participant } from '../src/types.js';

const app = express();
app.use(express.json());

const UPSTASH_REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function loadDb() {
  try {
    const res = await fetch(`${UPSTASH_REST_URL}/hgetall/quiniela_participants`, {
      headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}` }
    });
    const data = await res.json();
    let participants: Participant[] = [];
    if (data.result && Array.isArray(data.result)) {
      for (let i = 0; i < data.result.length; i += 2) {
        participants.push(typeof data.result[i + 1] === 'string' ? JSON.parse(data.result[i + 1]) : data.result[i + 1]);
      }
    }
    return participants;
  } catch { return []; }
}

app.post('/api/predictions', async (req, res) => {
  const { name, groupPicks, bracketPicks, selectedThirds } = req.body;
  const id = 'user_' + Math.random().toString(36).substring(2, 11);
  const participant = { id, name, groupPicks, bracketPicks, selectedThirds, createdAt: new Date().toISOString() };

  await fetch(`${UPSTASH_REST_URL}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_REST_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(['HSET', 'quiniela_participants', id, JSON.stringify(participant)])
  });

  const allParticipants = await loadDb();
  res.json({ participants: allParticipants });
});

app.get('/api/state', async (req, res) => {
  const participants = await loadDb();
  res.json({ participants, officialMatches: ALL_INITIAL_MATCHES });
});

export default app;