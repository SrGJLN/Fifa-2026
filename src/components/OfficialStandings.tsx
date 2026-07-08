/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, MatchPick, ActivePhase } from '../types';
import { GROUPS, getTeamName, TEAMS } from '../data/worldCupData';
import { calculateGroupStandings } from '../utils/football';
import TeamFlag from './TeamFlag';
import { Trophy, HelpCircle, Lock, TrendingUp, ChevronRight } from 'lucide-react';

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

interface MatchCardProps {
  match: Match | null;
  label?: string;
}

function MatchCard({ match, label }: MatchCardProps) {
  if (!match) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 w-52 opacity-50">
        <p className="text-xs text-slate-400 font-semibold text-center">{label || 'Por definir'}</p>
      </div>
    );
  }

  const isKnown = (id: string) => TEAMS.some(t => t.id === id);
  const homeName = isKnown(match.teamHomeId) ? getTeamName(match.teamHomeId) : match.teamHomeId;
  const awayName = isKnown(match.teamAwayId) ? getTeamName(match.teamAwayId) : match.teamAwayId;
  const hasResult = match.completed && match.teamHomeScore !== undefined && match.teamAwayScore !== undefined;
  const hasPenalties = hasResult && match.penaltyHomeScore !== undefined && match.penaltyAwayScore !== undefined;
  const homeWon = hasResult && (match.teamHomeScore! > match.teamAwayScore! || (hasPenalties && match.penaltyHomeScore! > match.penaltyAwayScore!));
  const awayWon = hasResult && (match.teamAwayScore! > match.teamHomeScore! || (hasPenalties && match.penaltyAwayScore! > match.penaltyHomeScore!));

  return (
    <div className={`border rounded-xl overflow-hidden w-52 shadow-sm ${match.completed ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white'}`}>
      {/* Fecha */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-semibold">{match.date} · {match.time}</span>
        {match.completed && <span className="text-[9px] font-bold text-emerald-600 uppercase">{hasPenalties ? 'Fin (P)' : 'Fin'}</span>}
      </div>

      {/* Equipo Local */}
      <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-50 ${homeWon ? 'bg-emerald-50/40' : ''}`}>
        <div className="flex items-center gap-2">
          {isKnown(match.teamHomeId) ? (
            <TeamFlag teamId={match.teamHomeId} className="w-5 h-3.5 shrink-0" />
          ) : (
            <span className="text-slate-300 text-xs font-mono w-5 text-center">?</span>
          )}
          <span className={`text-xs font-bold truncate max-w-[100px] ${homeWon ? 'text-emerald-700' : 'text-slate-700'}`}>{homeName}</span>
        </div>
        {hasResult && (
          <div className="flex flex-col items-end">
            <span className={`text-sm font-extrabold font-mono ${homeWon ? 'text-emerald-600' : 'text-slate-400'}`}>
              {match.teamHomeScore}
            </span>
            {hasPenalties && (
              <span className="text-[9px] text-amber-600 font-bold">({match.penaltyHomeScore})</span>
            )}
          </div>
        )}
        {!hasResult && <span className="text-slate-200 text-sm font-bold">-</span>}
      </div>

      {/* Equipo Visitante */}
      <div className={`flex items-center justify-between px-3 py-2 ${awayWon ? 'bg-emerald-50/40' : ''}`}>
        <div className="flex items-center gap-2">
          {isKnown(match.teamAwayId) ? (
            <TeamFlag teamId={match.teamAwayId} className="w-5 h-3.5 shrink-0" />
          ) : (
            <span className="text-slate-300 text-xs font-mono w-5 text-center">?</span>
          )}
          <span className={`text-xs font-bold truncate max-w-[100px] ${awayWon ? 'text-emerald-700' : 'text-slate-700'}`}>{awayName}</span>
        </div>
        {hasResult && (
          <div className="flex flex-col items-end">
            <span className={`text-sm font-extrabold font-mono ${awayWon ? 'text-emerald-600' : 'text-slate-400'}`}>
              {match.teamAwayScore}
            </span>
            {hasPenalties && (
              <span className="text-[9px] text-amber-600 font-bold">({match.penaltyAwayScore})</span>
            )}
          </div>
        )}
        {!hasResult && <span className="text-slate-200 text-sm font-bold">-</span>}
      </div>
    </div>
  );
}

export default function OfficialStandings({ groupMatches, allMatches = [], activePhase = 'group' }: OfficialStandingsProps) {
  const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const [expandedPhase, setExpandedPhase] = useState<string | null>(activePhase);

  const officialPicksMap = groupMatches.reduce((acc, m) => {
    if (m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined) {
      acc[m.id] = { teamHomeGoals: m.teamHomeScore, teamAwayGoals: m.teamAwayScore };
    }
    return acc;
  }, {} as { [id: number]: MatchPick });

  const getPhaseMatches = (stage: string) => allMatches.filter(m => {
    if (stage === 'final') return m.stage === 'final' || m.stage === 'third';
    return m.stage === stage;
  });

  const completedCount = activePhase === 'group'
    ? groupMatches.filter(m => m.completed).length
    : getPhaseMatches(phaseStage[activePhase]).filter(m => m.completed).length;

  const totalCount = activePhase === 'group'
    ? groupMatches.length
    : getPhaseMatches(phaseStage[activePhase]).length;

  const r32Matches = getPhaseMatches('r32');
  const r16Matches = getPhaseMatches('r16');
  const qfMatches = getPhaseMatches('qf');
  const sfMatches = getPhaseMatches('sf');
  const finalMatches = getPhaseMatches('final');

  const phases = [
    { id: 'r32', label: 'Dieciseisavos', matches: r32Matches },
    { id: 'r16', label: 'Octavos', matches: r16Matches },
    { id: 'qf', label: 'Cuartos', matches: qfMatches },
    { id: 'sf', label: 'Semifinales', matches: sfMatches },
    { id: 'final', label: 'Final', matches: finalMatches },
  ];

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

      {/* FASES ELIMINATORIAS — bracket visual */}
      {activePhase !== 'group' && (
        <div className="space-y-4">
          {phases.filter(p => p.matches.length > 0).map(phase => (
            <div key={phase.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              {/* Header colapsable */}
              <button
                type="button"
                onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${phase.matches.every(m => m.completed) ? 'bg-emerald-500' : phase.matches.some(m => m.completed) ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`} />
                  <span className="font-black text-slate-900 text-sm uppercase tracking-wide">{phase.label}</span>
                  <span className="text-xs text-slate-400 font-medium">
                    {phase.matches.filter(m => m.completed).length} / {phase.matches.length} jugados
                  </span>
                </div>
                <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedPhase === phase.id ? 'rotate-90' : ''}`} />
              </button>

              {/* Contenido del bracket */}
              {expandedPhase === phase.id && (
                <div className="px-5 pb-6 border-t border-slate-100 overflow-x-auto">
                  <div className="pt-4 flex items-start gap-6 min-w-max">
                    {/* Partidos de la fase */}
                    <div className="flex flex-col gap-4">
                      {phase.matches.map((m, idx) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 w-4 text-center">{idx + 1}</span>
                          <MatchCard match={m} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
