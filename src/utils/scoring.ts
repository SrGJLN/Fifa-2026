/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Match, MatchPick } from '../types';

export interface ScoreBreakdown {
  totalPoints: number;
  exactCount: number;
  outcomeCount: number;
}

/**
 * Calculates a participant's score against official match results.
 *
 * FASE DE GRUPOS (sin penales):
 * - 3 pts: Marcador exacto (ej: predijo 2-1, fue 2-1)
 * - 1 pt:  Acierta ganador o empate pero no el marcador exacto
 * - 0 pts: No acierta nada
 *
 * FASES ELIMINATORIAS (puede haber penales):
 * - 5 pts: Acierta el empate exacto (ej: 1-1) Y acierta el ganador en penales
 * - 3 pts: Acierta el empate exacto pero falla penales. O acierta marcador exacto sin penales.
 * - 1 pt:  Acierta el ganador final (por goles o por penales) pero falla el marcador
 * - 0 pts: No acierta nada
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

    const userHome = pick.teamHomeGoals !== undefined && pick.teamHomeGoals !== null ? Number(pick.teamHomeGoals) : undefined;
    const userAway = pick.teamAwayGoals !== undefined && pick.teamAwayGoals !== null ? Number(pick.teamAwayGoals) : undefined;
    const offHome = om.teamHomeScore !== undefined && om.teamHomeScore !== null ? Number(om.teamHomeScore) : undefined;
    const offAway = om.teamAwayScore !== undefined && om.teamAwayScore !== null ? Number(om.teamAwayScore) : undefined;

    if (userHome === undefined || userAway === undefined || offHome === undefined || offAway === undefined || isNaN(userHome) || isNaN(userAway) || isNaN(offHome) || isNaN(offAway)) return;

    const isGroupStage = om.stage === 'group';

    // ── FASE DE GRUPOS ──────────────────────────────────────────────
    if (isGroupStage) {
      if (userHome === offHome && userAway === offAway) {
        totalPoints += 3;
        exactCount++;
      } else {
        const userTrend = userHome > userAway ? 'home' : userHome < userAway ? 'away' : 'draw';
        const offTrend = offHome > offAway ? 'home' : offHome < offAway ? 'away' : 'draw';
        if (userTrend === offTrend) {
          totalPoints += 1;
          outcomeCount++;
        }
      }
      return;
    }

    // ── FASES ELIMINATORIAS ─────────────────────────────────────────
    const officialWentToPenalties = offHome === offAway && om.penaltyHomeScore !== undefined && om.penaltyAwayScore !== undefined;
    const userPredictedDraw = userHome === userAway;

    if (officialWentToPenalties) {
      // El partido oficial terminó empatado y se fue a penales
      const offPenHome = om.penaltyHomeScore!;
      const offPenAway = om.penaltyAwayScore!;

      // Ganador oficial en penales
      const officialPenaltyWinner = offPenHome > offPenAway ? om.teamHomeId : om.teamAwayId;

      if (userPredictedDraw) {
        // El usuario también predijo empate
        const exactDraw = userHome === offHome && userAway === offAway;
        const userPenHome = pick.penaltyHomeGoals;
        const userPenAway = pick.penaltyAwayGoals;
        const userPredictedPenaltyWinner = userPenHome !== undefined && userPenAway !== undefined
          ? (userPenHome > userPenAway ? om.teamHomeId : om.teamAwayId)
          : pick.winnerId ?? null;

        const aciertaPenales = userPredictedPenaltyWinner === officialPenaltyWinner;

        if (exactDraw && aciertaPenales) {
          // 5 pts: empate exacto + ganador en penales correcto
          totalPoints += 5;
          exactCount++;
        } else if (exactDraw && !aciertaPenales) {
          // 3 pts: empate exacto pero falla penales
          totalPoints += 3;
          exactCount++;
        } else if (!exactDraw && aciertaPenales) {
          // 1 pt: acierta ganador en penales pero no el marcador exacto
          totalPoints += 1;
          outcomeCount++;
        } else {
          // 0 pts
        }
      } else {
        // El usuario predijo un ganador (no empate)
        const userWinner = userHome > userAway ? om.teamHomeId : om.teamAwayId;
        if (userWinner === officialPenaltyWinner) {
          // 1 pt: acierta el ganador final pero no predijo empate
          totalPoints += 1;
          outcomeCount++;
        }
        // 0 pts si falla el ganador
      }
    } else {
      // El partido oficial NO fue a penales (se resolvió en tiempo normal)
      if (userHome === offHome && userAway === offAway) {
        // 3 pts: marcador exacto
        totalPoints += 3;
        exactCount++;
      } else {
        const userTrend = userHome > userAway ? 'home' : userHome < userAway ? 'away' : 'draw';
        const offTrend = offHome > offAway ? 'home' : offHome < offAway ? 'away' : 'draw';
        if (userTrend === offTrend) {
          // 1 pt: acierta ganador o empate
          totalPoints += 1;
          outcomeCount++;
        }
      }
    }
  });

  return { totalPoints, exactCount, outcomeCount };
};
