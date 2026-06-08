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

export interface Match {
  id: number;
  stage: StageId;
  groupLabel?: string; // e.g. 'A', 'B', etc. for group stage
  teamHomeId: string; // can be team ID or placeholder like '1A', '2B' for bracket matches
  teamAwayId: string;
  teamHomeScore?: number; // official score
  teamAwayScore?: number; // official score
  winnerId?: string; // official winner (for penalty shootout cases)
  date: string;
  time: string;
  venue: string;
  city: string;
  completed: boolean;
}

export interface MatchPick {
  teamHomeGoals?: number;
  teamAwayGoals?: number;
  winnerId?: string; // for penalty shootout tie-breaker
}

export interface GroupStanding {
  teamId: string;
  teamName: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number; // goals for
  ga: number; // goals against
  gd: number; // goal difference
  points: number;
}

export interface Participant {
  id: string;
  name: string;
  groupPicks: { [matchId: number]: MatchPick };
  bracketPicks: { [matchId: number]: MatchPick };
  selectedThirds: string[]; // List of teamIds chosen as 8 best thirds
  totalPoints: number;
  exactCount: number;
  outcomeCount: number;
  createdAt: string;
}

export interface OfficialData {
  matches: Match[];
  selectedThirds: string[]; // List of teamIds of the official 8 best thirds
}
