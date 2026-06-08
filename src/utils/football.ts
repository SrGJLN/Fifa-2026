/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match, MatchPick, GroupStanding } from '../types';
import { GROUPS, getTeamName, getTeamFlag } from '../data/worldCupData';

/**
 * Calculates a single group's standing table
 */
export const calculateGroupStandings = (
  groupLabel: string,
  groupMatches: Match[],
  picks: { [matchId: number]: MatchPick }
): GroupStanding[] => {
  const teamIds = GROUPS[groupLabel] || [];
  const standings: { [teamId: string]: GroupStanding } = {};

  teamIds.forEach((tId) => {
    standings[tId] = {
      teamId: tId,
      teamName: getTeamName(tId),
      flag: getTeamFlag(tId),
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      gd: 0,
      points: 0,
    };
  });

  const matchesInGroup = groupMatches.filter((m) => m.groupLabel === groupLabel);

  matchesInGroup.forEach((m) => {
    // Determine whether to use official score or the user's pick
    // Pick overrides base if present, fallback to empty or completed
    const pick = picks[m.id];
    
    // We only calculate if predictions exist (goals are filled)
    if (!pick || pick.teamHomeGoals === undefined || pick.teamAwayGoals === undefined) {
      return;
    }

    const hGoals = Number(pick.teamHomeGoals);
    const aGoals = Number(pick.teamAwayGoals);

    const home = standings[m.teamHomeId];
    const away = standings[m.teamAwayId];

    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.gf += hGoals;
    home.ga += aGoals;
    away.gf += aGoals;
    away.ga += hGoals;

    if (hGoals > aGoals) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (hGoals < aGoals) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      home.points += 1;
      away.drawn += 1;
      away.points += 1;
    }
  });

  // Calculate goal differences
  Object.values(standings).forEach((s) => {
    s.gd = s.gf - s.ga;
  });

  // Sort by points, then gd, then gf, then alphabetically
  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.teamName.localeCompare(b.teamName);
  });
};

/**
 * Gathers the 3rd place teams from all 12 groups, calculating their stats,
 * so the user/admin can manually pick the best 8 of them.
 */
export interface ThirdPlaceTeamInfo {
  groupLabel: string;
  teamId: string;
  teamName: string;
  flag: string;
  points: number;
  gd: number;
  gf: number;
}

export const getThirdPlaceTeams = (
  groupMatches: Match[],
  picks: { [matchId: number]: MatchPick }
): ThirdPlaceTeamInfo[] => {
  const thirds: ThirdPlaceTeamInfo[] = [];

  Object.keys(GROUPS).forEach((groupLabel) => {
    const standings = calculateGroupStandings(groupLabel, groupMatches, picks);
    // Standings are sorted 1st, 2nd, 3rd, 4th
    if (standings.length >= 3) {
      const third = standings[2]; // Index 2 is the 3rd place
      thirds.push({
        groupLabel,
        teamId: third.teamId,
        teamName: third.teamName,
        flag: third.flag,
        points: third.points,
        gd: third.gd,
        gf: third.gf,
      });
    }
  });

  // Sort them so they are presented in order of performance (a helper for manual entry!)
  return thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
};
