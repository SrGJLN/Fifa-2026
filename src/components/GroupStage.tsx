/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, MatchPick, GroupStanding } from '../types';
import { GROUPS, getTeamFlag, getTeamName } from '../data/worldCupData';
import TeamFlag from './TeamFlag';
import { calculateGroupStandings } from '../utils/football';
import { Globe, Search, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface GroupStageProps {
  groupMatches: Match[];
  picks: { [matchId: number]: MatchPick };
  onChangePick: (matchId: number, homeGoals: number | undefined, awayGoals: number | undefined) => void;
  readOnly?: boolean;
  participantName?: string; // If viewing someone else's picks
}

export default function GroupStage({
  groupMatches,
  picks,
  onChangePick,
  readOnly = false,
  participantName,
}: GroupStageProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [expandedGroupsList, setExpandedGroupsList] = useState<boolean>(false);

  const groupLabels = Object.keys(GROUPS);

  // Filter group matches based on search term and selected group
  const filteredMatches = groupMatches.filter((m) => {
    const matchesGroup = selectedGroup === 'all' || m.groupLabel === selectedGroup;
    
    const homeName = getTeamName(m.teamHomeId).toLowerCase();
    const awayName = getTeamName(m.teamAwayId).toLowerCase();
    const venue = m.venue.toLowerCase();
    const city = m.city.toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch =
      homeName.includes(q) ||
      awayName.includes(q) ||
      venue.includes(q) ||
      city.includes(q) ||
      (m.groupLabel && `grupo ${m.groupLabel}`.toLowerCase().includes(q));

    return matchesGroup && matchesSearch;
  });

  const updateGoalValue = (matchId: number, side: 'home' | 'away', change: number) => {
    if (readOnly) return;
    const current = picks[matchId] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
    const currentVal = side === 'home' ? current.teamHomeGoals : current.teamAwayGoals;
    
    let newVal = 0;
    if (currentVal !== undefined) {
      newVal = Math.max(0, currentVal + change);
    } else {
      // Starting from 0 on first tap
      newVal = change < 0 ? 0 : 1;
    }
    
    if (side === 'home') {
      onChangePick(matchId, newVal, current.teamAwayGoals);
    } else {
      onChangePick(matchId, current.teamHomeGoals, newVal);
    }
  };

  const handleInputChange = (matchId: number, side: 'home' | 'away', val: string) => {
    if (readOnly) return;
    const current = picks[matchId] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
    const numeric = val.trim() === '' ? undefined : Math.max(0, parseInt(val, 10));

    if (side === 'home') {
      onChangePick(matchId, numeric, current.teamAwayGoals);
    } else {
      onChangePick(matchId, current.teamHomeGoals, numeric);
    }
  };

  return (
    <div className="space-y-6" id="group-stage-predictions">
      
      {/* SECCIÓN FILTROS Y BUSQUEDA */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between" id="group-stage-filters">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
          <input
            type="text"
            placeholder="Buscar por país, ciudad o estadio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="flex-1 md:flex-initial py-2.5 px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm cursor-pointer"
          >
            <option value="all">Todos los Grupos</option>
            {groupLabels.map((g) => (
              <option key={g} value={g}>Grupo {g}</option>
            ))}
          </select>
        </div>
      </div>

      {readOnly && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-indigo-900 text-sm flex items-center gap-3">
          <Info className="w-5 h-5 shrink-0 text-indigo-500" />
          <span>
            Estás visualizando las predicciones de <strong>{participantName}</strong> de la Fase de Grupos en modo lectura.
          </span>
        </div>
      )}

      {/* VER LISTADO DE INTEGRANTES COMPONENT (COLLAPSABLE) */}
      <div className="border border-slate-100 rounded-2xl bg-white shadow-sm overflow-hidden" id="expandable-groups-list">
        <button
          type="button"
          onClick={() => setExpandedGroupsList(!expandedGroupsList)}
          className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors text-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-sm text-slate-900 tracking-wide uppercase">
              Ver listado e integrantes de la Fase de Grupos Oficial (12 Grupos)
            </span>
          </div>
          {expandedGroupsList ? (
            <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
              <span>Ocultar listado</span>
              <ChevronUp className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-slate-400 font-semibold">
              <span>Ver listado</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </button>

        {expandedGroupsList && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/20 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {groupLabels.map((g) => (
              <div key={g} className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-sm text-center">
                <span className="text-xs font-bold text-slate-400 block mb-2 border-b pb-1">GRUPO {g}</span>
                <ul className="space-y-2 text-xs font-semibold text-slate-700">
                  {GROUPS[g].map(tid => (
                    <li key={tid} className="flex items-center gap-2 justify-center py-0.5">
                      <TeamFlag teamId={tid} className="w-5.5 h-3.5" />
                      <span>{getTeamName(tid)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* REPORTE DINÁMICO DE POSICIONES AL SELECCIONAR UN GRUPO */}
      {selectedGroup !== 'all' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm" id="live-standings-widget">
          <h3 className="text-sm font-bold text-slate-900 mb-3 tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            TABLA EN VIVO: GRUPO {selectedGroup} SEGÚN TU PREDICCIÓN
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 font-medium border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100">
                  <th className="py-2.5 px-4 text-center w-8">#</th>
                  <th className="py-2.5 px-4">Equipo</th>
                  <th className="py-2.5 px-4 text-center">PJ</th>
                  <th className="py-2.5 px-4 text-center">PG</th>
                  <th className="py-2.5 px-4 text-center">PE</th>
                  <th className="py-2.5 px-4 text-center">PP</th>
                  <th className="py-2.5 px-4 text-center">Goles</th>
                  <th className="py-2.5 px-4 text-center">DG</th>
                  <th className="py-2.5 px-4 text-center">Pts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {calculateGroupStandings(selectedGroup, groupMatches, picks).map((row, idx) => {
                  const isTopTwo = idx < 2;
                  return (
                    <tr key={row.teamId} className={`hover:bg-slate-50/50 ${isTopTwo ? 'bg-emerald-50/5' : ''}`}>
                      <td className="py-2 px-4 text-center">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                          idx === 0 
                            ? 'bg-emerald-500 text-white' 
                            : idx === 1 
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-2 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <TeamFlag teamId={row.teamId} className="w-5.5 h-3.5" />
                        <span>{row.teamName}</span>
                      </td>
                      <td className="py-2 px-4 text-center font-mono">{row.played}</td>
                      <td className="py-2 px-4 text-center font-mono">{row.won}</td>
                      <td className="py-2 px-4 text-center font-mono">{row.drawn}</td>
                      <td className="py-2 px-4 text-center font-mono">{row.lost}</td>
                      <td className="py-2 px-4 text-center font-mono text-slate-400">{row.gf}:{row.ga}</td>
                      <td className="py-2 px-4 text-center font-mono font-semibold">
                        {row.gd > 0 ? `+${row.gd}` : row.gd}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-extrabold ${isTopTwo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                          {row.points}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            * Los dos primeros clasifican automáticamente a la ronda de dieciseisavos (R32).
          </div>
        </div>
      )}

      {/* PARTIDOS LLENADO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" id="group-stage-matches-grid">
        {filteredMatches.map((m) => {
          const pick = picks[m.id] || { teamHomeGoals: undefined, teamAwayGoals: undefined };
          const homeGoalsStr = pick.teamHomeGoals !== undefined ? String(pick.teamHomeGoals) : '';
          const awayGoalsStr = pick.teamAwayGoals !== undefined ? String(pick.teamAwayGoals) : '';

          return (
            <div
              key={m.id}
              className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Header metadata */}
              <div className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-50 pb-2">
                <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Grupo {m.groupLabel}
                </span>
                <span className="font-medium">{m.date} • {m.time}</span>
                <span className="font-medium text-slate-400">{m.city}</span>
              </div>

              {/* Grid de Marcadores con botones exactos */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3">
                
                {/* Equipo Local */}
                <div className="flex-1 flex items-center justify-end gap-2.5 text-right">
                  <span className="font-bold text-sm text-slate-800 leading-tight hidden text-ellipsis lg:line-clamp-1">{getTeamName(m.teamHomeId)}</span>
                  <span className="font-bold text-sm text-slate-800 leading-tight block lg:hidden">{m.teamHomeId}</span>
                  <TeamFlag teamId={m.teamHomeId} className="w-7 h-4.5" />
                </div>

                {/* Marcadores */}
                <div className="shrink-0 flex flex-col items-center gap-1.5 px-2">
                  <div className="flex items-center gap-1.5">
                    
                    {/* Input Home */}
                    <input
                      type="number"
                      placeholder="--"
                      min="0"
                      disabled={readOnly}
                      value={homeGoalsStr}
                      onChange={(e) => handleInputChange(m.id, 'home', e.target.value)}
                      className="w-12 h-12 border border-slate-300 rounded-xl text-center font-extrabold text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-50"
                    />

                    <span className="text-slate-400 font-extrabold text-lg px-0.5">:</span>

                    {/* Input Away */}
                    <input
                      type="number"
                      placeholder="--"
                      min="0"
                      disabled={readOnly}
                      value={awayGoalsStr}
                      onChange={(e) => handleInputChange(m.id, 'away', e.target.value)}
                      className="w-12 h-12 border border-slate-300 rounded-xl text-center font-extrabold text-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:bg-slate-50"
                    />

                  </div>
                  <span className="text-[10px] tracking-widest text-slate-400 font-extrabold">INGRESA TU SCORE</span>
                </div>

                {/* Equipo Visitante */}
                <div className="flex-1 flex items-center justify-start gap-2.5 text-left">
                  <TeamFlag teamId={m.teamAwayId} className="w-7 h-4.5" />
                  <span className="font-bold text-sm text-slate-800 leading-tight hidden text-ellipsis lg:line-clamp-1">{getTeamName(m.teamAwayId)}</span>
                  <span className="font-bold text-sm text-slate-800 leading-tight block lg:hidden">{m.teamAwayId}</span>
                </div>

              </div>

              {/* Venue */}
              <div className="text-[11px] text-slate-400 text-center">
                {m.venue}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
