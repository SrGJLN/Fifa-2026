/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Match, MatchPick, ActivePhase } from '../types';
import { GROUPS, getTeamName, TEAMS } from '../data/worldCupData';
import { calculateGroupStandings } from '../utils/football';
import TeamFlag from './TeamFlag';
import { Trophy, HelpCircle, Lock, TrendingUp } from 'lucide-react';

interface OfficialStandingsProps {
  groupMatches: Match[];
  allMatches?: Match[];
  activePhase?: ActivePhase;
}

const phaseLabel: Record<string, string> = {
  group: 'Fase de Grupos',
  r32: 'Dieciseisavos de Final',
  r16: 'Octavos de Final',
  qf: 'Cuartos de Final',
  sf: 'Semifinales',
  final: 'Final'
};

const phaseStage: Record<string, string> = {
  r32: 'r32',
  r16: 'r16',
  qf: 'qf',
  sf: 'sf',
  final: 'final'
};

export default function OfficialStandings({ groupMatches, allMatches = [], activePhase = 'group' }: OfficialStandingsProps) {
  const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  const officialPicksMap = groupMatches.reduce((acc, m) => {
    if (m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined) {
      acc[m.id] = { teamHomeGoals: m.teamHomeScore, teamAwayGoals: m.teamAwayScore };
    }
    return acc;
  }, {} as { [id: number]: MatchPick });

  const phaseMatches = allMatches.filter(m => {
    if (activePhase === 'final') return m.stage === 'final' || m.stage === 'third';
    return m.stage === phaseStage[activePhase];
  });

  const completedCount = activePhase === 'group'
    ? groupMatches.filter(m => m.completed).length
    : phaseMatches.filter(m => m.completed).length;

  const totalCount = activePhase === 'group'
    ? groupMatches.length
    : phaseMatches.length;

  const isKnownTeam = (id: string) => TEAMS.some(t => t.id === id);

  return (
    <div className="space-y-6" id="official-standings-section">

      {/* BANNER */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-rose-400">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="text-xs uppercase font-extrabold tracking-widest leading-none">Quiniela Oficial Cerrada</span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">El Torneo está en Marcha 🏆</h2>
          <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
            Fase actual: <strong className="text-white">{phaseLabel[activePhase]}</strong>. Sigue los resultados en tiempo real aquí abajo.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl shrink-0">
          <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </span>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Avance {phaseLabel[activePhase]}</span>
            <span className="font-extrabold text-sm text-slate-100">
              {completedCount} <span className="text-slate-500 font-medium">de {totalCount} jugados</span>
            </span>
          </div>
        </div>
      </div>

      {/* FASE DE GRUPOS */}
      {activePhase === 'group' && (
        <div>
          <h3 className="text-base font-black text-slate-900 mb-4 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Tablas de Posiciones Oficiales (Grupos A - L)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupLabels.map((g) => {
              const tableData = calculateGroupStandings(g, groupMatches, officialPicksMap);
              return (
                <div key={g} className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100">
                      <span className="font-extrabold text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">GRUPO {g}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {tableData.filter(t => t.played > 0).length > 0 ? 'En disputa' : 'Sin comenzar'}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600 font-medium border-collapse">
                        <thead>
                          <tr className="text-[9px] text-slate-400 uppercase font-black border-b border-slate-100">
                            <th className="py-1.5 w-6 text-center">#</th>
                            <th className="py-1.5">Equipo</th>
                            <th className="py-1.5 text-center w-8">PJ</th>
                            <th className="py-1.5 text-center w-6">G</th>
                            <th className="py-1.5 text-center w-6">P</th>
                            <th className="py-1.5 text-center w-8">DG</th>
                            <th className="py-1.5 text-center w-8 text-slate-900 font-extrabold">PTS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {tableData.map((row, idx) => {
                            const isTopTwo = idx < 2;
                            return (
                              <tr key={row.teamId} className={`hover:bg-slate-50/40 ${isTopTwo ? 'bg-emerald-50/5' : ''}`}>
                                <td className="py-2 text-center">
                                  <span className={`w-4 h-4 rounded flex items-center justify-center font-black text-[9px] ${idx === 0 ? 'bg-emerald-500 text-white'
                                      : idx === 1 ? 'bg-indigo-500 text-white'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}>{idx + 1}</span>
                                </td>
                                <td className="py-2 font-bold text-slate-800 flex items-center gap-1.5">
                                  <TeamFlag teamId={row.teamId} className="w-4.5 h-3 shrink-0" />
                                  <span className="truncate max-w-[70px] sm:max-w-none">{row.teamName}</span>
                                </td>
                                <td className="py-2 text-center font-mono text-[10px] text-slate-500">{row.played}</td>
                                <td className="py-2 text-center font-mono text-[10px] text-slate-500">{row.won}</td>
                                <td className="py-2 text-center font-mono text-[10px] text-slate-500">{row.lost}</td>
                                <td className="py-2 text-center font-mono text-[10px] text-slate-500 font-semibold">{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                                <td className="py-2 text-center">
                                  <span className={`px-1.5 py-0.5 rounded font-extrabold text-[10px] ${isTopTwo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                    {row.points}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-50 text-[9px] text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3 text-slate-300" />
                    <span>Avanzan los top 2 de cada grupo.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FASES ELIMINATORIAS — tarjetas verticales */}
      {activePhase !== 'group' && (
        <div>
          <h3 className="text-base font-black text-slate-900 mb-4 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {phaseLabel[activePhase]} — Resultados Oficiales
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {phaseMatches.map((m, idx) => {
              const homeName = getTeamName(m.teamHomeId);
              const awayName = getTeamName(m.teamAwayId);
              const hasResult = m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined;
              const hasPenalties = hasResult && m.penaltyHomeScore !== undefined && m.penaltyAwayScore !== undefined;
              const homeWon = hasResult && m.teamHomeScore! > m.teamAwayScore!;
              const awayWon = hasResult && m.teamAwayScore! > m.teamHomeScore!;
              const homePenWon = hasPenalties && m.penaltyHomeScore! > m.penaltyAwayScore!;
              const awayPenWon = hasPenalties && m.penaltyAwayScore! > m.penaltyHomeScore!;

              return (
                <div
                  key={m.id}
                  className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${m.completed ? 'border-emerald-100' : 'border-slate-100'
                    }`}
                >
                  {/* Header */}
                  <div className={`px-4 py-2 flex items-center justify-between text-xs ${m.completed ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-slate-50 border-b border-slate-100'
                    }`}>
                    <span className="font-extrabold text-indigo-600">#{idx + 1}</span>
                    <span className="text-slate-400 font-medium">{m.date} · {m.time}</span>
                  </div>

                  {/* Equipo Local */}
                  <div className={`flex items-center justify-between px-4 py-3 border-b border-slate-50 ${(homeWon || (hasResult && m.teamHomeScore === m.teamAwayScore && homePenWon)) ? 'bg-emerald-50/30' : ''
                    }`}>
                    <div className="flex items-center gap-2.5">
                      {isKnownTeam(m.teamHomeId) ? (
                        <TeamFlag teamId={m.teamHomeId} className="w-7 h-5 shrink-0" />
                      ) : (
                        <span className="text-slate-300 text-lg">🌐</span>
                      )}
                      <span className={`font-bold text-sm ${(homeWon || (hasResult && m.teamHomeScore === m.teamAwayScore && homePenWon))
                          ? 'text-emerald-700' : 'text-slate-800'
                        }`}>
                        {homeName}
                      </span>
                    </div>
                    <div className="text-right">
                      {hasResult ? (
                        <div className="flex flex-col items-end">
                          <span className={`font-extrabold text-xl font-mono ${(homeWon || (hasResult && m.teamHomeScore === m.teamAwayScore && homePenWon))
                              ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                            {m.teamHomeScore}
                          </span>
                          {hasPenalties && (
                            <span className="text-[10px] text-amber-600 font-bold">({m.penaltyHomeScore})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-200 font-extrabold text-xl">-</span>
                      )}
                    </div>
                  </div>

                  {/* Equipo Visitante */}
                  <div className={`flex items-center justify-between px-4 py-3 ${(awayWon || (hasResult && m.teamHomeScore === m.teamAwayScore && awayPenWon)) ? 'bg-emerald-50/30' : ''
                    }`}>
                    <div className="flex items-center gap-2.5">
                      {isKnownTeam(m.teamAwayId) ? (
                        <TeamFlag teamId={m.teamAwayId} className="w-7 h-5 shrink-0" />
                      ) : (
                        <span className="text-slate-300 text-lg">🌐</span>
                      )}
                      <span className={`font-bold text-sm ${(awayWon || (hasResult && m.teamHomeScore === m.teamAwayScore && awayPenWon))
                          ? 'text-emerald-700' : 'text-slate-800'
                        }`}>
                        {awayName}
                      </span>
                    </div>
                    <div className="text-right">
                      {hasResult ? (
                        <div className="flex flex-col items-end">
                          <span className={`font-extrabold text-xl font-mono ${(awayWon || (hasResult && m.teamHomeScore === m.teamAwayScore && awayPenWon))
                              ? 'text-emerald-600' : 'text-slate-400'
                            }`}>
                            {m.teamAwayScore}
                          </span>
                          {hasPenalties && (
                            <span className="text-[10px] text-amber-600 font-bold">({m.penaltyAwayScore})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-200 font-extrabold text-xl">-</span>
                      )}
                    </div>
                  </div>

                  {/* Footer penales */}
                  {hasPenalties && (
                    <div className="px-4 py-1.5 bg-amber-50 border-t border-amber-100 text-center">
                      <span className="text-[10px] text-amber-700 font-bold">Definido en penales</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
