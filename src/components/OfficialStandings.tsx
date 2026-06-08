/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Match, MatchPick } from '../types';
import { GROUPS, getTeamName, getTeamFlag } from '../data/worldCupData';
import { calculateGroupStandings } from '../utils/football';
import TeamFlag from './TeamFlag';
import { Trophy, HelpCircle, Lock, TrendingUp } from 'lucide-react';

interface OfficialStandingsProps {
  groupMatches: Match[];
}

export default function OfficialStandings({ groupMatches }: OfficialStandingsProps) {
  const groupLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Convert completed official matches to Picks representation to reuse calculateGroupStandings helper
  const officialPicksMap = groupMatches.reduce((acc, m) => {
    if (m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined) {
      acc[m.id] = { teamHomeGoals: m.teamHomeScore, teamAwayGoals: m.teamAwayScore };
    }
    return acc;
  }, {} as { [id: number]: MatchPick });

  return (
    <div className="space-y-6" id="official-standings-section">
      
      {/* BANNER DE TORNEO EN MARCHA */}
      <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl" id="locked-tournament-banner">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-rose-400">
            <Lock className="w-4 h-4 shrink-0" />
            <span className="text-xs uppercase font-extrabold tracking-widest leading-none">Quiniela Oficial Cerrada</span>
          </div>
          <h2 className="text-xl font-black tracking-tight mt-1">El Torneo está en Marcha 🏆</h2>
          <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
            Las predicciones de todos los participantes ya han sido selladas y guardadas. A continuación, puedes seguir en tiempo real la tabla de posiciones de los Grupos A al L según los partidos que se vayan jugando en el mundial.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl shrink-0">
          <span className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="w-5 h-5 shadow-inner" />
          </span>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Avance Fase Grupos</span>
            <span className="font-extrabold text-sm text-slate-100">
              {groupMatches.filter(m => m.completed).length} <span className="text-slate-500 font-medium">de {groupMatches.length} jugados</span>
            </span>
          </div>
        </div>
      </div>

      {/* REPORTE DE LOS 12 GRUPOS EN GRID */}
      <div>
        <h3 className="text-base font-black text-slate-900 mb-4 uppercase tracking-wide flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Tablas de Posiciones Oficiales (Grupos A - L)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="official-groups-bento-grid">
          {groupLabels.map((g) => {
            const tableData = calculateGroupStandings(g, groupMatches, officialPicksMap);
            
            return (
              <div key={g} className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all p-4.5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-slate-100">
                    <span className="font-extrabold text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      GRUPO {g}
                    </span>
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
                                <span className={`w-4 h-4 rounded flex items-center justify-center font-black text-[9px] ${
                                  idx === 0 
                                    ? 'bg-emerald-500 text-white' 
                                    : idx === 1 
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {idx + 1}
                                </span>
                              </td>
                              <td className="py-2 font-bold text-slate-800 flex items-center gap-1.5 line-clamp-1">
                                <TeamFlag teamId={row.teamId} className="w-4.5 h-3 shrink-0" />
                                <span className="truncate max-w-[70px] sm:max-w-none">{row.teamName}</span>
                              </td>
                              <td className="py-2 text-center font-mono text-[10px] text-slate-500">{row.played}</td>
                              <td className="py-2 text-center font-mono text-[10px] text-slate-500">{row.won}</td>
                              <td className="py-2 text-center font-mono text-[10px] text-slate-500">{row.lost}</td>
                              <td className="py-2 text-center font-mono text-[10px] text-slate-500 font-semibold">
                                {row.gd > 0 ? `+${row.gd}` : row.gd}
                              </td>
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

    </div>
  );
}
