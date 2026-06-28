/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match } from '../types';
import { getTeamName } from '../data/worldCupData';
import TeamFlag from './TeamFlag';
import { Trophy, ChevronDown, ChevronUp } from 'lucide-react';

interface OfficialR32TableProps {
  officialMatches: Match[];
}

export default function OfficialR32Table({ officialMatches }: OfficialR32TableProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const r32Matches = officialMatches.filter((m) => m.stage === 'r32');
  const completedCount = r32Matches.filter((m) => m.completed).length;

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-4" id="official-r32-table-container">
      {/* Header / Toggle Button */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-extrabold shadow-sm">
            <Trophy className="w-5 h-5 shrink-0" />
          </span>
          <div className="text-left">
            <h3 className="text-sm font-black text-slate-900 leading-tight">Cruces y Resultados Oficiales de Dieciseisavos</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
              Fase eliminatoria de R32 • {completedCount} de 16 partidos jugados
            </p>
          </div>
        </div>
        <div className="text-slate-400 hover:text-slate-600">
          {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </div>
      </button>

      {/* Table Content */}
      {!isCollapsed && (
        <div className="overflow-x-auto border-t border-slate-100 pt-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-155 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                <th className="py-2.5 px-4 text-center w-12">#</th>
                <th className="py-2.5 px-4 text-right pr-6 w-[40%]">Local</th>
                <th className="py-2.5 px-4 text-center w-12">vs</th>
                <th className="py-2.5 px-4 text-left pl-6 w-[40%]">Visitante</th>
                <th className="py-2.5 px-4 text-center w-28">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r32Matches.map((m, idx) => {
                const hasResult = m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined;
                const hasPenalties = hasResult && m.penaltyHomeScore !== undefined && m.penaltyAwayScore !== undefined;

                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-slate-50/50 transition-colors ${m.completed ? 'bg-emerald-50/5' : ''}`}
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-extrabold text-xs flex items-center justify-center mx-auto">
                        {idx + 1}
                      </span>
                    </td>

                    {/* Local */}
                    <td className="py-3.5 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-2.5">
                        <span className="font-bold text-sm text-slate-800">{getTeamName(m.teamHomeId)}</span>
                        <TeamFlag teamId={m.teamHomeId} className="w-6 h-4 shrink-0" />
                      </div>
                    </td>

                    {/* vs */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="text-slate-300 font-extrabold text-xs uppercase">vs</span>
                    </td>

                    {/* Visitante */}
                    <td className="py-3.5 px-4 text-left pl-6">
                      <div className="flex items-center gap-2.5">
                        <TeamFlag teamId={m.teamAwayId} className="w-6 h-4 shrink-0" />
                        <span className="font-bold text-sm text-slate-800">{getTeamName(m.teamAwayId)}</span>
                      </div>
                    </td>

                    {/* Resultado */}
                    <td className="py-3.5 px-4 text-center">
                      {hasResult ? (
                        <div className="flex flex-col items-center gap-0.5 justify-center">
                          <span className="px-3 py-1 bg-slate-950 text-white rounded-full font-extrabold text-xs font-mono">
                            {m.teamHomeScore} - {m.teamAwayScore}
                          </span>
                          {hasPenalties && (
                            <span className="text-[9px] text-amber-600 font-black tracking-wide uppercase">
                              Pen: {m.penaltyHomeScore} - {m.penaltyAwayScore}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-bold text-sm">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
