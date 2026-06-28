/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Team {
  id: string;
  name: string;
  flag: string;
}

export type StageId = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'third' | 'final';

export type ActivePhase = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final';

export interface Match {
  id: number;
  stage: StageId;
  groupLabel?: string;
  teamHomeId: string;
  teamAwayId: string;
  teamHomeScore?: number;
  teamAwayScore?: number;
  winnerId?: string;
  // Resultado en penales (solo para partidos de bracket que terminen empatados)
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  date: string;
  time: string;
  venue: string;
  city: string;
  completed: boolean;
}

export interface MatchPick {
  teamHomeGoals?: number;
  teamAwayGoals?: number;
  winnerId?: string;
  // Predicción de penales (solo aplica en bracket cuando el usuario predice empate)
  penaltyHomeGoals?: number;
  penaltyAwayGoals?: number;
}

export interface GroupStanding {
  teamId: string;
  teamName: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface Participant {
  id: string;
  name: string;
  groupPicks: { [matchId: number]: MatchPick };
  bracketPicks: { [matchId: number]: MatchPick };
  selectedThirds: string[];
  totalPoints: number;
  exactCount: number;
  outcomeCount: number;
  createdAt: string;
  // Puntos acumulados por fase
  pointsGroup?: number;
  pointsR32?: number;
  pointsR16?: number;
  pointsQF?: number;
  pointsSF?: number;
  pointsFinal?: number;
  // Control de qué fases ya completó el participante
  completedPhases?: ActivePhase[];
}

export interface OfficialData {
  matches: Match[];
  selectedThirds: string[];
}
