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
}

// Calcula puntos para partidos de bracket
function calcBracketPoints(pick: MatchPick, match: Match): number | null {
  if (!match.completed || match.teamHomeScore === undefined || match.teamAwayScore === undefined) return null;
  if (pick.teamHomeGoals === undefined || pick.teamAwayGoals === undefined) return null;

  const officialWentToPenalties = match.teamHomeScore === match.teamAwayScore &&
    match.penaltyHomeScore !== undefined && match.penaltyAwayScore !== undefined;

  const userPredictedDraw = pick.teamHomeGoals === pick.teamAwayGoals;

  if (officialWentToPenalties) {
    const officialPenaltyWinner = (match.penaltyHomeScore! > match.penaltyAwayScore!)
      ? match.teamHomeId : match.teamAwayId;

    if (userPredictedDraw) {
      const exactDraw = pick.teamHomeGoals === match.teamHomeScore && pick.teamAwayGoals === match.teamAwayScore;
      const userPenaltyWinner = pick.penaltyHomeGoals !== undefined && pick.penaltyAwayGoals !== undefined
        ? (pick.penaltyHomeGoals > pick.penaltyAwayGoals ? match.teamHomeId : match.teamAwayId)
        : pick.winnerId ?? null;
      const aciertaPenales = userPenaltyWinner === officialPenaltyWinner;

      if (exactDraw && aciertaPenales) return 5;
      if (exactDraw && !aciertaPenales) return 3;
      if (!exactDraw && aciertaPenales) return 1;
      return 0;
    } else {
      const userWinner = pick.teamHomeGoals > pick.teamAwayGoals ? match.teamHomeId : match.teamAwayId;
      return userWinner === officialPenaltyWinner ? 1 : 0;
    }
  } else {
    if (pick.teamHomeGoals === match.teamHomeScore && pick.teamAwayGoals === match.teamAwayScore) return 3;
    const userTrend = pick.teamHomeGoals > pick.teamAwayGoals ? 'home' : pick.teamHomeGoals < pick.teamAwayGoals ? 'away' : 'draw';
    const offTrend = match.teamHomeScore > match.teamAwayScore ? 'home' : match.teamHomeScore < match.teamAwayScore ? 'away' : 'draw';
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
    if (placeholder.length === 3 && placeholder === placeholder.toUpperCase() && !placeholder.startsWith('G') && !placeholder.startsWith('P')) {
      return TEAMS.find((team) => team.id === placeholder) || null;
    }
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
    const pick = bracketPicks[matchId];
    if (!pick || pick.teamHomeGoals === undefined || pick.teamAwayGoals === undefined) return null;
    const homeG = Number(pick.teamHomeGoals);
    const awayG = Number(pick.teamAwayGoals);
    if (homeG > awayG) return teamHome;
    if (awayG > homeG) return teamAway;
    // Empate: usar winnerId o resultado de penales
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
        alert('Solo puedes seleccionar los 8 mejores terceros lugares para avanzar a Dieciseisavos (R32).');
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
    // Si ya no hay empate, limpiar penales y winnerId
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
    // Determinar winnerId automáticamente según penales
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

      {/* SELECCIÓN DE MEJORES TERCEROS */}
      {activeStageTab === 'r32' && (
        <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-slate-800">Tus 8 Mejores Terceros Lugares</h3>
          </div>
          <p className="text-slate-500 text-xs mb-5 max-w-4xl font-medium leading-relaxed">
            De acuerdo a tus predicciones de la Fase de Grupos, se han calculado los siguientes 3ros lugares de cada uno de los 12 grupos.
            <strong> Selecciona los 8 oficiales</strong> que clasificarán a tu ronda de Dieciseisavos de Final (T1 a T8).
          </p>
          {calculatedThirds.length === 0 ? (
            <div className="p-4 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-semibold flex items-center gap-2">
              <InfoOutlineIcon />
              <span>Aún no hay terceros calculados. Empieza ingresando predicciones de fase de grupos para activarlos.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {calculatedThirds.map((team, idx) => {
                  const isSelected = selectedThirds.includes(team.teamId);
                  const isSuggested = idx < 8;
                  return (
                    <div
                      key={team.teamId}
                      onClick={() => handleToggleThird(team.teamId)}
                      className={`p-3 border rounded-xl relative cursor-pointer text-center select-none transition-all ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                          : isSuggested ? 'border-slate-200 bg-emerald-50/10 hover:border-indigo-400'
                            : 'border-slate-100 hover:border-indigo-200 bg-white'
                        }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">3ro G{team.groupLabel}</span>
                      <div className="flex justify-center mb-1.5">
                        <TeamFlag teamId={team.teamId} className="w-8 h-5.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 leading-normal block truncate">{team.teamName}</span>
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">{team.points} pts | DG {team.gd}</span>
                      <div className={`absolute top-2 right-2 w-4.5 h-4.5 rounded-full border flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-300'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
                <span className={`px-2.5 py-0.5 rounded-full font-bold shadow-sm ${selectedThirds.length === 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                  {selectedThirds.length} / 8 Seleccionados
                </span>
                <span className="text-slate-400 font-semibold">(Esto llena los puestos vacíos T1, T2,... T8 en la llave a continuación).</span>
              </div>
            </div>
          )}
        </div>
      )}

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

          // Penales predichos
          const penHStr = pick.penaltyHomeGoals !== undefined ? String(pick.penaltyHomeGoals) : '';
          const penAStr = pick.penaltyAwayGoals !== undefined ? String(pick.penaltyAwayGoals) : '';

          // Puntos obtenidos (solo en readOnly)
          const points = readOnly ? calcBracketPoints(pick, m) : null;
          const pointsColor = points === 5 ? 'bg-amber-500 text-white'
            : points === 3 ? 'bg-emerald-500 text-white'
              : points === 1 ? 'bg-indigo-500 text-white'
                : points === 0 ? 'bg-rose-500 text-white'
                  : 'bg-slate-100 text-slate-400';

          // Resultado oficial de penales
          const officialHasPenalties = m.completed && m.teamHomeScore === m.teamAwayScore
            && m.penaltyHomeScore !== undefined && m.penaltyAwayScore !== undefined;

          return (
            <div
              key={m.id}
              className={`bg-white border rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden ${hasTiePredicted && !readOnly && pick.winnerId === undefined && penHStr === ''
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
                  {/* Resultado oficial de penales en modo lectura */}
                  {readOnly && officialHasPenalties ? (
                    <span className="text-[10px] text-amber-600 font-extrabold tracking-wider">
                      PENALES: {m.penaltyHomeScore} - {m.penaltyAwayScore}
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

              {/* Panel de penales — cuando el usuario predice empate */}
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

function InfoOutlineIcon() {
  return (
    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
