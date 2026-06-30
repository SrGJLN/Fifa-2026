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
 * - 3 pts: Marcador exacto
 * - 1 pt:  Acierta ganador o empate pero no el marcador exacto
 * - 0 pts: No acierta nada
 *
 * FASES ELIMINATORIAS (puede haber penales):
 * - 6 pts: Empate exacto + penales exactos
 * - 4 pts: Empate exacto + acierta ganador en penales (sin marcador exacto de penales)
 * - 3 pts: Empate exacto + falla ganador y marcador de penales
 * - 3 pts: Acierta que hubo empate (sin marcador exacto) + acierta marcador exacto de penales y ganador
 * - 3 pts: Marcador exacto sin empate (resuelto en tiempo normal)
 * - 2 pts: Acierta que hubo empate (sin marcador exacto) + acierta solo ganador en penales
 * - 1 pt:  Acierta solo el ganador final (tiempo normal o penales), sin marcador exacto
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
      const offPenHome = om.penaltyHomeScore!;
      const offPenAway = om.penaltyAwayScore!;
      const officialPenaltyWinner = offPenHome > offPenAway ? om.teamHomeId : om.teamAwayId;

      const userPenHome = pick.penaltyHomeGoals;
      const userPenAway = pick.penaltyAwayGoals;

      const hasUserPenaltyPrediction = userPenHome !== undefined && userPenAway !== undefined;
      const userPredictedPenaltyWinner = hasUserPenaltyPrediction
        ? (userPenHome! > userPenAway! ? om.teamHomeId : om.teamAwayId)
        : (pick.winnerId ?? null);

      const aciertaGanadorPenales = userPredictedPenaltyWinner === officialPenaltyWinner;
      const aciertaPenalesExacto = hasUserPenaltyPrediction && userPenHome === offPenHome && userPenAway === offPenAway;

      if (userPredictedDraw) {
        // El usuario predijo empate
        const exactDraw = userHome === offHome && userAway === offAway;

        if (exactDraw && aciertaPenalesExacto) {
          // 6 pts: empate exacto + penales exactos
          totalPoints += 6;
          exactCount++;
        } else if (exactDraw && aciertaGanadorPenales) {
          // 4 pts: empate exacto + acierta ganador en penales (sin marcador exacto de penales)
          totalPoints += 4;
          exactCount++;
        } else if (exactDraw && !aciertaGanadorPenales) {
          // 3 pts: empate exacto + falla ganador y marcador de penales
          totalPoints += 3;
          exactCount++;
        } else if (!exactDraw && aciertaPenalesExacto) {
          // 3 pts: acierta que hubo empate (sin marcador exacto) + acierta marcador exacto de penales y ganador
          totalPoints += 3;
          outcomeCount++;
        } else if (!exactDraw && aciertaGanadorPenales) {
          // 2 pts: acierta que hubo empate (sin marcador exacto) + acierta solo ganador en penales
          totalPoints += 2;
          outcomeCount++;
        }
        // 0 pts si no acierta empate ni ganador en penales
      } else {
        // El usuario predijo un ganador (no empate)
        const userWinner = userHome > userAway ? om.teamHomeId : om.teamAwayId;
        if (userWinner === officialPenaltyWinner) {
          // 1 pt: acierta el ganador final por penales pero no predijo empate
          totalPoints += 1;
          outcomeCount++;
        }
        // 0 pts si falla el ganador
      }
    } else {
      // El partido oficial NO fue a penales (se resolvió en tiempo normal)
      if (userHome === offHome && userAway === offAway) {
        // 3 pts: marcador exacto sin empate
        totalPoints += 3;
        exactCount++;
      } else {
        const userTrend = userHome > userAway ? 'home' : userHome < userAway ? 'away' : 'draw';
        const offTrend = offHome > offAway ? 'home' : offHome < offAway ? 'away' : 'draw';
        if (userTrend === offTrend) {
          // 1 pt: acierta ganador en tiempo normal
          totalPoints += 1;
          outcomeCount++;
        }
      }
    }
  });

  return { totalPoints, exactCount, outcomeCount };
};
