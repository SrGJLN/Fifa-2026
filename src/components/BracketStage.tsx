/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, MatchPick, GroupStanding, Team } from '../types';
import { getTeamName, TEAMS } from '../data/worldCupData';
import TeamFlag from './TeamFlag';
import { calculateGroupStandings, getThirdPlaceTeams } from '../utils/football';
import { Trophy, Check, MapPin, Sparkles } from 'lucide-react';

interface BracketStageProps {
  bracketMatches: Match[];
  groupMatches: Match[];
  groupPicks: { [matchId: number]: MatchPick };
  bracketPicks: { [matchId: number]: MatchPick };
  selectedThirds: string[];
  onChangeBracketPick: (matchId: number, homeGoals: number | undefined, awayGoals: number | undefined, winnerId?: string, penaltyHomeGoals?: number, penaltyAwayGoals?: number) => void;
  onChangeSelectedThirds: (thirds: string[]) => void;
  readOnly?: boolean;
  participantName?: string;
  officialMatches?: Match[];
}

function calcBracketPoints(pick: MatchPick, match: Match): number | null {
  if (!match.completed || match.teamHomeScore === undefined || match.teamAwayScore === undefined) return null;
  if (pick.teamHomeGoals === undefined || pick.teamAwayGoals === undefined) return null;

  const userHome = Number(pick.teamHomeGoals);
  const userAway = Number(pick.teamAwayGoals);
  const offHome = Number(match.teamHomeScore);
  const offAway = Number(match.teamAwayScore);

  const officialWentToPenalties = offHome === offAway &&
    match.penaltyHomeScore !== undefined &&
    match.penaltyAwayScore !== undefined;

  const userPredictedDraw = userHome === userAway;

  if (officialWentToPenalties) {
    const offPenHome = match.penaltyHomeScore!;
    const offPenAway = match.penaltyAwayScore!;
    const officialPenaltyWinner = offPenHome > offPenAway ? match.teamHomeId : match.teamAwayId;

    if (userPredictedDraw) {
      const exactDraw = userHome === offHome && userAway === offAway;
      const userPenHome = pick.penaltyHomeGoals;
      const userPenAway = pick.penaltyAwayGoals;
      const hasUserPenaltyPrediction = userPenHome !== undefined && userPenAway !== undefined;
      const aciertaPenalesExacto = hasUserPenaltyPrediction &&
        Number(userPenHome) === offPenHome &&
        Number(userPenAway) === offPenAway;
      const userPredictedPenaltyWinner = hasUserPenaltyPrediction
        ? (Number(userPenHome!) > Number(userPenAway!) ? match.teamHomeId : match.teamAwayId)
        : (pick.winnerId ?? null);
      const aciertaGanadorPenales = userPredictedPenaltyWinner === officialPenaltyWinner;

      if (exactDraw && aciertaPenalesExacto) return 6;
      if (exactDraw && aciertaGanadorPenales) return 4;
      if (exactDraw && !aciertaGanadorPenales) return 3;
      if (!exactDraw && aciertaPenalesExacto) return 3;
      if (!exactDraw && aciertaGanadorPenales) return 2;
      return 0;
    } else {
      return 0;
    }
  } else {
    if (userHome === offHome && userAway === offAway) return 3;
    const userTrend = userHome > userAway ? 'home' : userHome < userAway ? 'away' : 'draw';
    const offTrend = offHome > offAway ? 'home' : offHome < offAway ? 'away' : 'draw';
    return userTrend === offTrend ? 1 : 0;
  }
}

export default function BracketStage({
  bracketMatches,
  groupMatches,
  groupPicks,
  bracketPicks,
  selectedThirds,
  onChangeBracketPick,
  onChangeSelectedThirds,
  readOnly = false,
  participantName,
  officialMatches = [],
}: BracketStageProps) {
  const [activeStageTab, setActiveStageTab] = useState<string>('r32');

  const bracketStages = [
    { id: 'r32', name: 'Dieciseisavos' },
    { id: 'r16', name: 'Octavos' },
    { id: 'qf', name: 'Cuartos' },
    { id: 'sf', name: 'Semifinales' },
    { id: 'final', name: 'Finales' },
  ];

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const standingsByGroup: { [key: string]: GroupStanding[] } = {};
  groups.forEach((g) => {
    standingsByGroup[g] = calculateGroupStandings(g, groupMatches, groupPicks);
  });

  const calculatedThirds = getThirdPlaceTeams(groupMatches, groupPicks);

  const resolveTeam = (placeholder: string): Team | null => {
    // Primero verificar si es un equipo real en TEAMS
    const directTeam = TEAMS.find(t => t.id === placeholder);
    if (directTeam) return directTeam;

    if (placeholder.match(/^[12][A-L]$/)) {
      const idx = parseInt(placeholder.charAt(0), 10) - 1;
      const g = placeholder.charAt(1);
      const row = (standingsByGroup[g] || [])[idx];
      return row ? { id: row.teamId, name: row.teamName, flag: row.flag } : null;
    }
    if (placeholder.match(/^T[1-8]$/)) {
      const orderIdx = parseInt(placeholder.charAt(1), 10) - 1;
      const teamId = selectedThirds[orderIdx];
      return teamId ? (TEAMS.find((team) => team.id === teamId) || null) : null;
    }
    if (placeholder.startsWith('G')) {
      return resolveMatchWinner(parseInt(placeholder.substring(1), 10));
    }
    if (placeholder.startsWith('P')) {
      return resolveMatchLoser(parseInt(placeholder.substring(1), 10));
    }
    return null;
  };

  const resolveMatchWinner = (matchId: number): Team | null => {
    const parentMatch = bracketMatches.find((m) => m.id === matchId);
    if (!parentMatch) return null;
    const teamHome = resolveTeam(parentMatch.teamHomeId);
    const teamAway = resolveTeam(parentMatch.teamAwayId);
    if (!teamHome || !teamAway) return null;

    // Primero intentar resolver con resultado oficial
    const officialMatch = officialMatches?.find(m => m.id === matchId);
    if (officialMatch?.completed && officialMatch.teamHomeScore !== undefined && officialMatch.teamAwayScore !== undefined) {
      const offHome = officialMatch.teamHomeScore;
      const offAway = officialMatch.teamAwayScore;
      if (offHome > offAway) return teamHome;
      if (offAway > offHome) return teamAway;
      if (officialMatch.penaltyHomeScore !== undefined && officialMatch.penaltyAwayScore !== undefined) {
        return officialMatch.penaltyHomeScore > officialMatch.penaltyAwayScore ? teamHome : teamAway;
      }
      if (officialMatch.winnerId === teamHome.id) return teamHome;
      if (officialMatch.winnerId === teamAway.id) return teamAway;
    }

    // Si no hay resultado oficial, usar predicción del usuario
    const pick = bracketPicks[matchId];
    if (!pick || pick.teamHomeGoals === undefined || pick.teamAwayGoals === undefined) return null;
    const homeG = Number(pick.teamHomeGoals);
    const awayG = Number(pick.teamAwayGoals);
    if (homeG > awayG) return teamHome;
    if (awayG > homeG) return teamAway;
    const penaltyWinner = pick.penaltyHomeGoals !== undefined && pick.penaltyAwayGoals !== undefined
      ? (pick.penaltyHomeGoals > pick.penaltyAwayGoals ? teamHome : teamAway)
      : null;
    if (penaltyWinner) return penaltyWinner;
    if (pick.winnerId === teamHome.id) return teamHome;
    if (pick.winnerId === teamAway.id) return teamAway;
    return null;
  };

  const resolveMatchLoser = (matchId: number): Team | null => {
    const parentMatch = bracketMatches.find((m) => m.id === matchId);
    if (!parentMatch) return null;
    const teamHome = resolveTeam(parentMatch.teamHomeId);
    const teamAway = resolveTeam(parentMatch.teamAwayId);
    if (!teamHome || !teamAway) return null;
    const winner = resolveMatchWinner(matchId);
    if (!winner) return null;
    return winner.id === teamHome.id ? teamAway : teamHome;
  };

  const handleToggleThird = (teamId: string) => {
    if (readOnly) return;
    let nextThirds = [...selectedThirds];
    if (nextThirds.includes(teamId)) {
      nextThirds = nextThirds.filter((id) => id !== teamId);
    } else {
      if (nextThirds.length >= 8) {
        alert('Solo puedes seleccionar los 8 mejores terceros lugares.');
        return;
      }
      nextThirds.push(teamId);
    }
    onChangeSelectedThirds(nextThirds);
  };

  const handleManualInputChange = (matchId: number, side: 'home' | 'away', val: string) => {
    if (readOnly) return;
    const current = bracketPicks[matchId] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
    const numeric = val.trim() === '' ? undefined : Math.max(0, parseInt(val, 10));
    const hG = side === 'home' ? numeric : current.teamHomeGoals;
    const aG = side === 'away' ? numeric : current.teamAwayGoals;
    let wId = current.winnerId;
    let penH = current.penaltyHomeGoals;
    let penA = current.penaltyAwayGoals;
    if (hG !== undefined && aG !== undefined && hG !== aG) {
      wId = undefined;
      penH = undefined;
      penA = undefined;
    }
    onChangeBracketPick(matchId, hG, aG, wId, penH, penA);
  };

  const handlePenaltyInputChange = (matchId: number, side: 'home' | 'away', val: string) => {
    if (readOnly) return;
    const current = bracketPicks[matchId] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
    const numeric = val.trim() === '' ? undefined : Math.max(0, parseInt(val, 10));
    const penH = side === 'home' ? numeric : current.penaltyHomeGoals;
    const penA = side === 'away' ? numeric : current.penaltyAwayGoals;
    let wId = current.winnerId;
    if (penH !== undefined && penA !== undefined && penH !== penA) {
      const resolvedHome = resolveTeam(bracketMatches.find(m => m.id === matchId)?.teamHomeId || '');
      const resolvedAway = resolveTeam(bracketMatches.find(m => m.id === matchId)?.teamAwayId || '');
      wId = penH > penA ? (resolvedHome?.id || wId) : (resolvedAway?.id || wId);
    }
    onChangeBracketPick(matchId, current.teamHomeGoals, current.teamAwayGoals, wId, penH, penA);
  };

  const currentStageMatches = bracketMatches.filter((m) => {
    if (activeStageTab === 'final') return m.stage === 'final' || m.stage === 'third';
    return m.stage === activeStageTab;
  });

  return (
    <div className="space-y-8" id="bracket-predictions">

      {/* SUB-MENÚ DE FASES */}
      <div className="flex border-b border-slate-100 pb-px">
        {bracketStages.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveStageTab(s.id)}
            className={`flex-1 py-3 px-1 text-center font-bold text-sm border-b-2 transition-all focus:outline-none ${activeStageTab === s.id ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
              }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {readOnly && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-indigo-900 text-sm flex items-center gap-2">
          <span>Estás viendo las predicciones de <strong>{participantName}</strong> de fases finales.</span>
        </div>
      )}

      {/* PARTIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {currentStageMatches.map((m) => {
          const resolvedHome = resolveTeam(m.teamHomeId);
          const resolvedAway = resolveTeam(m.teamAwayId);
          const pick = bracketPicks[m.id] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
          const hGoalsStr = pick.teamHomeGoals !== undefined ? String(pick.teamHomeGoals) : '';
          const aGoalsStr = pick.teamAwayGoals !== undefined ? String(pick.teamAwayGoals) : '';
          const hasTiePredicted = pick.teamHomeGoals !== undefined && pick.teamAwayGoals !== undefined && Number(pick.teamHomeGoals) === Number(pick.teamAwayGoals);
          const penHStr = pick.penaltyHomeGoals !== undefined ? String(pick.penaltyHomeGoals) : '';
          const penAStr = pick.penaltyAwayGoals !== undefined ? String(pick.penaltyAwayGoals) : '';
          const points = readOnly ? calcBracketPoints(pick, m) : null;

          const pointsColor = points === 6 ? 'bg-yellow-400 text-slate-900'
            : points === 4 ? 'bg-orange-500 text-white'
              : points === 3 ? 'bg-emerald-500 text-white'
                : points === 2 ? 'bg-teal-500 text-white'
                  : points === 1 ? 'bg-indigo-500 text-white'
                    : points === 0 ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 text-slate-400';

          const officialHasPenalties = m.completed && m.teamHomeScore === m.teamAwayScore
            && m.penaltyHomeScore !== undefined && m.penaltyAwayScore !== undefined;

          return (
            <div
              key={m.id}
              className={`bg-white border rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden ${hasTiePredicted && !readOnly && penHStr === ''
                ? 'border-indigo-200 ring-2 ring-indigo-500/20'
                : 'border-slate-100'
                }`}
            >
              {/* Puntos obtenidos */}
              {readOnly && points !== null && (
                <div className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-sm ${pointsColor}`}>
                  {points}
                </div>
              )}

              {/* Header */}
              <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-50 pb-2">
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {m.stage === 'r32' ? 'Dieciseisavos'
                    : m.stage === 'r16' ? 'Octavos'
                      : m.stage === 'qf' ? 'Cuartos'
                        : m.stage === 'sf' ? 'Semifinal'
                          : m.stage === 'third' ? 'Tercer Lugar'
                            : 'FINAL'}
                </span>
                <span className="font-medium">Partido #{m.id}</span>
                <span className="font-semibold text-slate-800">{m.date} - {m.time}</span>
              </div>

              {/* Equipos y marcador */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex-1 flex flex-col items-end text-right">
                  {resolvedHome ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 leading-tight block truncate max-w-[120px] md:max-w-none">{resolvedHome.name}</span>
                      <TeamFlag teamId={resolvedHome.id} className="w-7 h-4.5" />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 py-1 px-2.5 rounded-lg font-mono">{m.teamHomeId}</span>
                  )}
                  {resolvedHome && <span className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider font-bold">{m.teamHomeId}</span>}
                </div>

                <div className="shrink-0 flex flex-col items-center gap-1.5 px-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number" placeholder="--" min="0"
                      disabled={readOnly || !resolvedHome || !resolvedAway}
                      value={hGoalsStr}
                      onChange={(e) => handleManualInputChange(m.id, 'home', e.target.value)}
                      className="w-11 h-11 border border-slate-300 rounded-xl text-center font-extrabold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-slate-400 font-extrabold text-base px-0.5">:</span>
                    <input
                      type="number" placeholder="--" min="0"
                      disabled={readOnly || !resolvedHome || !resolvedAway}
                      value={aGoalsStr}
                      onChange={(e) => handleManualInputChange(m.id, 'away', e.target.value)}
                      className="w-11 h-11 border border-slate-300 rounded-xl text-center font-extrabold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  {/* Resultado oficial */}
                  {readOnly && m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined ? (
                    <span className="text-[10px] text-slate-500 font-extrabold tracking-wider">
                      OFICIAL: {m.teamHomeScore} - {m.teamAwayScore}
                      {officialHasPenalties && ` (Pen: ${m.penaltyHomeScore}-${m.penaltyAwayScore})`}
                    </span>
                  ) : (
                    <span className="text-[9px] tracking-wider text-slate-400 font-extrabold">PRONÓSTICO</span>
                  )}
                </div>

                <div className="flex-1 flex flex-col items-start text-left">
                  {resolvedAway ? (
                    <div className="flex items-center gap-2">
                      <TeamFlag teamId={resolvedAway.id} className="w-7 h-4.5" />
                      <span className="font-bold text-sm text-slate-800 leading-tight block truncate max-w-[120px] md:max-w-none">{resolvedAway.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 py-1 px-2.5 rounded-lg font-mono">{m.teamAwayId}</span>
                  )}
                  {resolvedAway && <span className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider font-bold">{m.teamAwayId}</span>}
                </div>
              </div>

              {/* Venue */}
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-medium">
                <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                <span>{m.venue} ({m.city})</span>
              </div>

              {/* Panel de penales */}
              {hasTiePredicted && resolvedHome && resolvedAway && !readOnly && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
                  <p className="text-xs font-bold text-amber-900 text-center flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Empate — Ingresa tu predicción de penales
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-amber-700 font-semibold truncate max-w-[70px] text-center">{resolvedHome.name}</span>
                      <input
                        type="number" placeholder="--" min="0"
                        value={penHStr}
                        onChange={(e) => handlePenaltyInputChange(m.id, 'home', e.target.value)}
                        className="w-11 h-10 text-center border border-amber-300 rounded-xl font-bold text-base text-amber-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    <span className="text-amber-600 font-extrabold text-lg mt-4">:</span>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-amber-700 font-semibold truncate max-w-[70px] text-center">{resolvedAway.name}</span>
                      <input
                        type="number" placeholder="--" min="0"
                        value={penAStr}
                        onChange={(e) => handlePenaltyInputChange(m.id, 'away', e.target.value)}
                        className="w-11 h-10 text-center border border-amber-300 rounded-xl font-bold text-base text-amber-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  {penHStr === '' || penAStr === '' ? (
                    <p className="text-[10px] text-amber-600 text-center font-semibold">* Ingresa el resultado de penales para completar tu predicción.</p>
                  ) : Number(penHStr) === Number(penAStr) ? (
                    <p className="text-[10px] text-rose-500 text-center font-semibold">* Los penales no pueden terminar empatados.</p>
                  ) : (
                    <p className="text-[10px] text-emerald-600 text-center font-semibold">
                      ✓ Clasifica: {Number(penHStr) > Number(penAStr) ? resolvedHome.name : resolvedAway.name}
                    </p>
                  )}
                </div>
              )}

              {/* Penales del participante en modo lectura */}
              {readOnly && hasTiePredicted && (penHStr !== '' || penAStr !== '') && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-center">
                  <p className="text-[10px] text-amber-700 font-bold">
                    Predicción penales: {resolvedHome?.name} {penHStr} - {penAStr} {resolvedAway?.name}
                  </p>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}
