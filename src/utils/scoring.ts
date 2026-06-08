/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match, MatchPick, StageId } from '../types';

export interface ScoreBreakdown {
  totalPoints: number;
  exactCount: number;
  outcomeCount: number;
}

/**
 * Calculates a participant's score against official match results.
 * 
 * Rules:
 * - Exact Score (3 pts): User predicted scores match actual scores exactly (e.g. user predicted 2-1, official is 2-1).
 * - Correct Winner / Draw (1 pt): User guessed the correct outcome (home win, away win, or draw) but not the exact score (e.g. user predicted 1-0, official is 2-1).
 * - Otherwise: 0 pts.
 * 
 * Note: For brackets, if it's a draw, they can specify a winnerId in MatchPick to predict who advances.
 */
export const calculatePoints = (
  userPicks: { [matchId: number]: MatchPick },
  officialMatches: Match[]
): ScoreBreakdown => {
  let totalPoints = 0;
  let exactCount = 0;
  let outcomeCount = 0;

  officialMatches.forEach((om) => {
    if (!om.completed) return;
    
    const pick = userPicks[om.id];
    if (!pick) return;

    const userHome = pick.teamHomeGoals;
    const userAway = pick.teamAwayGoals;
    const offHome = om.teamHomeScore;
    const offAway = om.teamAwayScore;

    if (userHome === undefined || userAway === undefined || offHome === undefined || offAway === undefined) {
      return;
    }

    // Check exact score matching
    if (userHome === offHome && userAway === offAway) {
      totalPoints += 3;
      exactCount++;
    } else {
      // Check correct outcome matching
      const userTrend = userHome > userAway ? 'home' : userHome < userAway ? 'away' : 'draw';
      const offTrend = offHome > offAway ? 'home' : offHome < offAway ? 'away' : 'draw';

      if (userTrend === offTrend) {
        totalPoints += 1;
        outcomeCount++;
      } else if (userTrend === 'draw' && offTrend === 'draw') {
        // If both thought draw but actual score drawing was different, already handled above
        totalPoints += 1;
        outcomeCount++;
      }
    }
  });

  return {
    totalPoints,
    exactCount,
    outcomeCount
  };
};
