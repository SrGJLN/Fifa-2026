/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, MatchPick, GroupStanding, Team } from '../types';
import { getTeamFlag, getTeamName, TEAMS } from '../data/worldCupData';
import TeamFlag from './TeamFlag';
import { calculateGroupStandings, getThirdPlaceTeams } from '../utils/football';
import { Trophy, HelpCircle, Check, MapPin, ChevronRight, Sparkles } from 'lucide-react';

interface BracketStageProps {
  bracketMatches: Match[];
  groupMatches: Match[];
  groupPicks: { [matchId: number]: MatchPick };
  bracketPicks: { [matchId: number]: MatchPick };
  selectedThirds: string[];
  onChangeBracketPick: (matchId: number, homeGoals: number | undefined, awayGoals: number | undefined, winnerId?: string) => void;
  onChangeSelectedThirds: (thirds: string[]) => void;
  readOnly?: boolean;
  participantName?: string;
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

  // 1. Calculate group standings based on current user predictions
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const standingsByGroup: { [key: string]: GroupStanding[] } = {};
  groups.forEach((g) => {
    standingsByGroup[g] = calculateGroupStandings(g, groupMatches, groupPicks);
  });

  // Calculate the potential 3rd place teams from current group predictions
  const calculatedThirds = getThirdPlaceTeams(groupMatches, groupPicks);

  // 2. Resolve placeholder to actual Team object
  const resolveTeam = (placeholder: string): Team | null => {
    // Exact team already (e.g. 'MEX')
    if (placeholder.length === 3 && placeholder === placeholder.toUpperCase() && !placeholder.startsWith('G') && !placeholder.startsWith('P')) {
      const t = TEAMS.find((team) => team.id === placeholder);
      return t || null;
    }

    // 1A, 2B, etc.
    if (placeholder.match(/^[12][A-L]$/)) {
      const idx = parseInt(placeholder.charAt(0), 10) - 1; // 1st or 2nd
      const g = placeholder.charAt(1);
      const table = standingsByGroup[g] || [];
      const row = table[idx];
      return row ? { id: row.teamId, name: row.teamName, flag: row.flag } : null;
    }

    // Best Thirds T1 to T8
    if (placeholder.match(/^T[1-8]$/)) {
      const orderIdx = parseInt(placeholder.charAt(1), 10) - 1;
      const teamId = selectedThirds[orderIdx];
      if (teamId) {
        const t = TEAMS.find((team) => team.id === teamId);
        return t || null;
      }
      return null;
    }

    // Winners of bracket matches (G101, G102, etc.)
    if (placeholder.startsWith('G')) {
      const mId = parseInt(placeholder.substring(1), 10);
      return resolveMatchWinner(mId);
    }

    // Losers of bracket matches (P401, P402 for 3rd place match)
    if (placeholder.startsWith('P')) {
      const mId = parseInt(placeholder.substring(1), 10);
      return resolveMatchLoser(mId);
    }

    return null;
  };

  // Resolve the winner of a match recursively
  const resolveMatchWinner = (matchId: number): Team | null => {
    const parentMatch = bracketMatches.find((m) => m.id === matchId);
    if (!parentMatch) return null;

    const teamHome = resolveTeam(parentMatch.teamHomeId);
    const teamAway = resolveTeam(parentMatch.teamAwayId);

    if (!teamHome || !teamAway) return null;

    const pick = bracketPicks[matchId];
    if (!pick || pick.teamHomeGoals === undefined || pick.teamAwayGoals === undefined) {
      return null;
    }

    const homeG = Number(pick.teamHomeGoals);
    const awayG = Number(pick.teamAwayGoals);

    if (homeG > awayG) {
      return teamHome;
    } else if (awayG > homeG) {
      return teamAway;
    } else {
      // Draw needs manual penalty shootout helper selection
      if (pick.winnerId === teamHome.id) return teamHome;
      if (pick.winnerId === teamAway.id) return teamAway;
      return null;
    }
  };

  // Resolve the loser of a match recursively
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

  // Toggle third place checkbox
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

  const handleUpdateScore = (matchId: number, side: 'home' | 'away', change: number) => {
    if (readOnly) return;
    const current = bracketPicks[matchId] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
    const currentVal = side === 'home' ? current.teamHomeGoals : current.teamAwayGoals;

    let newVal = 0;
    if (currentVal !== undefined) {
      newVal = Math.max(0, currentVal + change);
    } else {
      newVal = change < 0 ? 0 : 1;
    }

    const hG = side === 'home' ? newVal : current.teamHomeGoals;
    const aG = side === 'away' ? newVal : current.teamAwayGoals;

    // Reset winnerId if goals are no longer tied
    let wId = current.winnerId;
    if (hG !== undefined && aG !== undefined && hG !== aG) {
      wId = undefined;
    }

    onChangeBracketPick(matchId, hG, aG, wId);
  };

  const handleManualInputChange = (matchId: number, side: 'home' | 'away', val: string) => {
    if (readOnly) return;
    const current = bracketPicks[matchId] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
    const numeric = val.trim() === '' ? undefined : Math.max(0, parseInt(val, 10));

    const hG = side === 'home' ? numeric : current.teamHomeGoals;
    const aG = side === 'away' ? numeric : current.teamAwayGoals;

    let wId = current.winnerId;
    if (hG !== undefined && aG !== undefined && hG !== aG) {
      wId = undefined;
    }

    onChangeBracketPick(matchId, hG, aG, wId);
  };

  const selectWinnerTie = (matchId: number, winnerId: string) => {
    if (readOnly) return;
    const current = bracketPicks[matchId] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
    onChangeBracketPick(matchId, current.teamHomeGoals, current.teamAwayGoals, winnerId);
  };

  // Filter which matches to display based on the selected interactive stage sub-tab
  const currentStageMatches = bracketMatches.filter((m) => {
    if (activeStageTab === 'final') {
      return m.stage === 'final' || m.stage === 'third';
    }
    return m.stage === activeStageTab;
  });

  return (
    <div className="space-y-8" id="bracket-predictions">
      
      {/* 1. SELECCIÓN DE MEJORES TERCEROS (INTERACTIVO SÓLO EN R32) */}
      {activeStageTab === 'r32' && (
        <div className="bg-slate-50 border border-slate-200/60 rounded-3xl p-6 shadow-sm" id="thirds-selector-pane">
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
                  const isSuggested = idx < 8; // Auto priority suggestions
                  
                  return (
                    <div
                      key={team.teamId}
                      onClick={() => handleToggleThird(team.teamId)}
                      className={`p-3 border rounded-xl relative cursor-pointer text-center select-none transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold'
                          : isSuggested
                          ? 'border-slate-200 bg-emerald-50/10 hover:border-indigo-400'
                          : 'border-slate-100 hover:border-indigo-200 bg-white'
                      }`}
                    >
                      {/* Posición en su grupo */}
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        3ro G{team.groupLabel}
                      </span>
                      
                      {/* Bandera y Nombre */}
                      <div className="flex justify-center mb-1.5">
                        <TeamFlag teamId={team.teamId} className="w-8 h-5.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 leading-normal block truncate">{team.teamName}</span>
                      
                      {/* Score predict */}
                      <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                        {team.points} pts | DG {team.gd}
                      </span>

                      {/* Check Bubble */}
                      <div className={`absolute top-2 right-2 w-4.5 h-4.5 rounded-full border flex items-center justify-center ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-indigo-600' 
                          : 'bg-white border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4 text-xs">
                <span className={`px-2.5 py-0.5 rounded-full font-bold shadow-sm ${
                  selectedThirds.length === 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedThirds.length} / 8 Seleccionados
                </span>
                <span className="text-slate-400 font-semibold">
                  (Esto llena los puestos vacíos T1, T2,... T8 en la llave a continuación).
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SUB-MENÚ DE FASES DE BRACKETS */}
      <div className="flex border-b border-slate-100 pb-px" id="bracket-stages-nav">
        {bracketStages.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActiveStageTab(s.id)}
            className={`flex-1 py-3 px-1 text-center font-bold text-sm border-b-2 transition-all focus:outline-none ${
              activeStageTab === s.id
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
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

      {/* 3. LISTADO DE PARTIDOS DE LA FASE ACTIVA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5" id="bracket-matches-cards">
        {currentStageMatches.map((m) => {
          const resolvedHome = resolveTeam(m.teamHomeId);
          const resolvedAway = resolveTeam(m.teamAwayId);

          const pick = bracketPicks[m.id] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
          const hGoalsStr = pick.teamHomeGoals !== undefined ? String(pick.teamHomeGoals) : '';
          const aGoalsStr = pick.teamAwayGoals !== undefined ? String(pick.teamAwayGoals) : '';

          // Determine if there is a predicted tie that needs a manual shootout winner
          const hasTiePredicted = pick.teamHomeGoals !== undefined && pick.teamAwayGoals !== undefined && Number(pick.teamHomeGoals) === Number(pick.teamAwayGoals);

          return (
            <div
              key={m.id}
              className={`bg-white border rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden ${
                hasTiePredicted && pick.winnerId === undefined 
                  ? 'border-indigo-200 ring-2 ring-indigo-500/20' 
                  : 'border-slate-100'
              }`}
            >
              {/* Card Header metadata */}
              <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-50 pb-2">
                <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {m.stage === 'r32' 
                    ? 'Dieciseisavos' 
                    : m.stage === 'r16' 
                    ? 'Octavos' 
                    : m.stage === 'qf' 
                    ? 'Cuartos' 
                    : m.stage === 'sf' 
                    ? 'Semifinal' 
                    : m.stage === 'third' 
                    ? 'Tercer Lugar' 
                    : 'FINAL'}
                </span>
                <span className="font-medium">Partido #{m.id}</span>
                <span className="font-semibold text-slate-800">{m.date} - {m.time}</span>
              </div>

              {/* Grid content */}
              <div className="flex items-center justify-between gap-2.5">
                
                {/* Home Team Column */}
                <div className="flex-1 flex flex-col items-end text-right">
                  {resolvedHome ? (
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 leading-tight block truncate max-w-[120px] md:max-w-none">
                        {resolvedHome.name}
                      </span>
                      <TeamFlag teamId={resolvedHome.id} className="w-7 h-4.5" />
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 py-1 px-2.5 rounded-lg font-mono">
                      {m.teamHomeId} {/* Shows placeholder like '1A', 'G101' */}
                    </span>
                  )}
                  {resolvedHome && (
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider font-bold">
                      {m.teamHomeId}
                    </span>
                  )}
                </div>

                {/* Score Controls */}
                <div className="shrink-0 flex flex-col items-center gap-1.5 px-1.5">
                  <div className="flex items-center gap-1.5">
                    
                    {/* Input Home */}
                    <input
                      type="number"
                      placeholder="--"
                      min="0"
                      disabled={readOnly || !resolvedHome || !resolvedAway}
                      value={hGoalsStr}
                      onChange={(e) => handleManualInputChange(m.id, 'home', e.target.value)}
                      className="w-11 h-11 border border-slate-300 rounded-xl text-center font-extrabold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                    <span className="text-slate-400 font-extrabold text-base px-0.5">:</span>

                    {/* Input Away */}
                    <input
                      type="number"
                      placeholder="--"
                      min="0"
                      disabled={readOnly || !resolvedHome || !resolvedAway}
                      value={aGoalsStr}
                      onChange={(e) => handleManualInputChange(m.id, 'away', e.target.value)}
                      className="w-11 h-11 border border-slate-300 rounded-xl text-center font-extrabold text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />

                  </div>
                  <span className="text-[9px] tracking-wider text-slate-400 font-extrabold">PRONÓSTICO</span>
                </div>

                {/* Away Team Column */}
                <div className="flex-1 flex flex-col items-start text-left">
                  {resolvedAway ? (
                    <div className="flex items-center gap-2">
                      <TeamFlag teamId={resolvedAway.id} className="w-7 h-4.5" />
                      <span className="font-bold text-sm text-slate-800 leading-tight block truncate max-w-[120px] md:max-w-none">
                        {resolvedAway.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 py-1 px-2.5 rounded-lg font-mono">
                      {m.teamAwayId}
                    </span>
                  )}
                  {resolvedAway && (
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider font-bold">
                      {m.teamAwayId}
                    </span>
                  )}
                </div>

              </div>

              {/* Arena Info */}
              <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 font-medium">
                <MapPin className="w-3 h-3 text-slate-300 shrink-0" />
                <span>{m.venue} ({m.city})</span>
              </div>

              {/* Tie advancement tiebreaker selection */}
              {hasTiePredicted && resolvedHome && resolvedAway && (
                <div className="mt-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3 text-center transition-all">
                  <p className="text-[11px] font-bold text-indigo-950 mb-2 flex items-center justify-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-indigo-500 shrink-0 animate-bounce" />
                    ¿Quién avanza en penales?
                  </p>
                  
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => selectWinnerTie(m.id, resolvedHome.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        pick.winnerId === resolvedHome.id 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <TeamFlag teamId={resolvedHome.id} className="w-5 h-3.5" />
                      <span>{resolvedHome.name}</span>
                    </button>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => selectWinnerTie(m.id, resolvedAway.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        pick.winnerId === resolvedAway.id 
                          ? 'bg-indigo-600 text-white shadow-sm' 
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <TeamFlag teamId={resolvedAway.id} className="w-5 h-3.5" />
                      <span>{resolvedAway.name}</span>
                    </button>
                  </div>
                  
                  {pick.winnerId === undefined && (
                    <span className="text-[9px] text-rose-500 font-bold block mt-2">
                       * Debes seleccionar un clasificado para poder avanzar la llave.
                    </span>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
}

// Simple fallback icon
function InfoOutlineIcon() {
  return (
    <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
