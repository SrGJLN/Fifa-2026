/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, Participant } from '../types';
import { getTeamFlag, getTeamName } from '../data/worldCupData';
import TeamFlag from './TeamFlag';
import { getThirdPlaceTeams } from '../utils/football';
import { RefreshCw, Play, Trophy, Users, ShieldAlert, Check, HelpCircle, Save } from 'lucide-react';

interface SincronizadorProps {
  officialMatches: Match[];
  officialThirds: string[];
  participants: Participant[];
  onUpdateMatch: (matchId: number, home: number | undefined, away: number | undefined, completed: boolean, winnerId?: string) => Promise<void>;
  onUpdateThirds: (thirds: string[]) => Promise<void>;
  onResetAll: () => Promise<void>;
  onSeedData: () => void;
  predictionsClosed: boolean;
  onTogglePredictionsClosed: (closed: boolean) => Promise<void>;
}

export default function Sincronizador({
  officialMatches,
  officialThirds,
  participants,
  onUpdateMatch,
  onUpdateThirds,
  onResetAll,
  onSeedData,
  predictionsClosed,
  onTogglePredictionsClosed,
}: SincronizadorProps) {
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [savingMatches, setSavingMatches] = useState<{ [id: number]: boolean }>({});
  const [tempScores, setTempScores] = useState<{ [id: number]: { home: string; away: string; winnerId?: string } }>({});

  const stages = [
    { id: 'all', name: 'Todas las Fases' },
    { id: 'group', name: 'Fase de Grupos (72p)' },
    { id: 'r32', name: 'Dieciseisavos de Final (16p)' },
    { id: 'r16', name: 'Octavos de Final (8p)' },
    { id: 'qf', name: 'Cuartos de Final (4p)' },
    { id: 'sf', name: 'Semifinales (2p)' },
    { id: 'third', name: 'Tercer Lugar' },
    { id: 'final', name: 'Final' },
  ];

  const groups = ['all', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Handle score change in the input
  const handleScoreChange = (matchId: number, side: 'home' | 'away', val: string) => {
    const current = tempScores[matchId] || {
      home: String(officialMatches.find(m => m.id === matchId)?.teamHomeScore ?? ''),
      away: String(officialMatches.find(m => m.id === matchId)?.teamAwayScore ?? ''),
      winnerId: officialMatches.find(m => m.id === matchId)?.winnerId
    };
    
    setTempScores({
      ...tempScores,
      [matchId]: {
        ...current,
        [side]: val
      }
    });
  };

  const setBracketWinner = (matchId: number, winnerId: string) => {
    const current = tempScores[matchId] || {
      home: String(officialMatches.find(m => m.id === matchId)?.teamHomeScore ?? ''),
      away: String(officialMatches.find(m => m.id === matchId)?.teamAwayScore ?? ''),
    };

    setTempScores({
      ...tempScores,
      [matchId]: {
        ...current,
        winnerId
      }
    });
  };

  // Save official match result
  const handleSaveMatch = async (matchId: number) => {
    const match = officialMatches.find(m => m.id === matchId);
    if (!match) return;

    setSavingMatches(prev => ({ ...prev, [matchId]: true }));
    try {
      const temp = tempScores[matchId];
      const homeVal = temp ? temp.home : String(match.teamHomeScore ?? '');
      const awayVal = temp ? temp.away : String(match.teamAwayScore ?? '');
      const winnerId = temp ? temp.winnerId : match.winnerId;

      if (homeVal.trim() === '' || awayVal.trim() === '') {
        // Mark as incomplete / pending
        await onUpdateMatch(matchId, undefined, undefined, false, undefined);
      } else {
        await onUpdateMatch(matchId, Number(homeVal), Number(awayVal), true, winnerId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMatches(prev => ({ ...prev, [matchId]: false }));
    }
  };

  // Toggle official qualifiers of the third place
  const handleToggleThird = async (teamId: string) => {
    let nextThirds = [...officialThirds];
    if (nextThirds.includes(teamId)) {
      nextThirds = nextThirds.filter(id => id !== teamId);
    } else {
      if (nextThirds.length >= 8) {
        alert("Ya has seleccionado los 8 mejores terceros. Desmarca uno para añadir otro.");
        return;
      }
      nextThirds.push(teamId);
    }
    await onUpdateThirds(nextThirds);
  };

  // Filter logic
  const filteredMatches = officialMatches.filter(m => {
    const matchesStage = filterStage === 'all' || m.stage === filterStage;
    const matchesGroup = filterGroup === 'all' || (m.stage === 'group' && m.groupLabel === filterGroup);
    return matchesStage && matchesGroup;
  });

  // Calculate dynamic list of current 3rd place teams from official matches
  // So the admin can choose from the actual 3rd place teams
  const officialPicksMap = officialMatches.reduce((acc, m) => {
    if (m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined) {
      acc[m.id] = { teamHomeGoals: m.teamHomeScore, teamAwayGoals: m.teamAwayScore };
    }
    return acc;
  }, {} as { [id: number]: { teamHomeGoals: number; teamAwayGoals: number } });

  const calculatedThirds = getThirdPlaceTeams(
    officialMatches.filter(m => m.stage === 'group'),
    officialPicksMap
  );

  return (
    <div className="space-y-8" id="sincronizador-tab">
      
      {/* SECCIÓN 1: REGLAMENTO Y SUMARIO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* REGLAMENTO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between" id="rules-card">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
                <Trophy className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-wide">Reglamento de Puntaje</h3>
            </div>
            
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Los puntos se calculan automáticamente para todos los jugadores cuando ingresas un resultado oficial a continuación.
            </p>

            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-slate-100">Acierto Exacto</p>
                  <p className="text-xs text-slate-400">Puntaje igual al resultado final (ej: predijo 2-1, oficial fue 2-1).</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-slate-100">Acierto de Ganador o Empate</p>
                  <p className="text-xs text-slate-400">Predijo el ganador o el empate pero erró el marcador exacto.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">0</span>
                <div>
                  <p className="font-semibold text-slate-100">Error</p>
                  <p className="text-xs text-slate-400">Resultado totalmente incorrecto o sin predicción válida.</p>
                </div>
              </li>
            </ul>
          </div>
          
          <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-500 flex items-center gap-1.5 mt-4">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Los empates en brackets requieren marcar quién avanza en el selector.</span>
          </div>
        </div>

        {/* METRICAS Y CIERRE DE QUINIELA */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between" id="stats-card">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className={`p-2 rounded-xl ${predictionsClosed ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                {predictionsClosed ? <ShieldAlert className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </span>
              <h3 className="text-lg font-semibold tracking-wide">Cerrar Quiniela</h3>
            </div>
            
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              {predictionsClosed 
                ? 'La quiniela está CERRADA. Ningún usuario puede ingresar nuevas predicciones o guardarlas.' 
                : 'La quiniela está ABIERTA. Los participantes pueden ingresar y registrar sus predicciones.'}
            </p>

            <div className="space-y-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs col-span-2">
                <span className="text-slate-400">Estado predictions:</span>
                <span className={`font-bold uppercase ${predictionsClosed ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {predictionsClosed ? '🔒 CERRADA' : '🔓 ABIERTA'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total participantes:</span>
                <span className="font-semibold text-white">{participants.length} registrados</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Partidos oficiales:</span>
                <span className="font-semibold text-white">
                  {officialMatches.filter(m => m.completed).length} / {officialMatches.length}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onTogglePredictionsClosed(!predictionsClosed)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5 focus:outline-none ${
                predictionsClosed 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
              }`}
            >
              {predictionsClosed ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Reabrir Quiniela
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5" /> Cerrar Quiniela (Bloquear)
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onSeedData}
              className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 transition-all rounded-xl text-xs font-semibold flex items-center justify-center gap-1"
            >
              <Play className="w-3 h-3 animate-pulse" /> Sembrar Demo (Amigos)
            </button>
          </div>
        </div>

        {/* ACCIONES DEL ADMINISTRADOR */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between" id="admin-actions-card">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-slate-500/15 text-slate-400 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-wide">Área Administrativa</h3>
            </div>

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Aquí puedes restablecer toda la quiniela a su estado original (vacía sin participantes ni scores) para iniciar un torneo real de cero con tus amigos.
            </p>
          </div>

          <button
            onClick={() => {
              if (confirm("¿Estás absolutamente seguro de que deseas borrar todos los participantes registrados y limpiar los resultados oficiales? Esta acción es irreversible.")) {
                onResetAll();
              }
            }}
            className="w-full py-3 px-4 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-800/50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Resetear Quiniela Completa
          </button>
        </div>

      </div>

      {/* SECCIÓN 2: SECTOR DE LOS 8 MEJORES TERCEROS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm" id="thirds-admin-panel">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Paso Especial: Los 8 Mejores Terceros Oficiales</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-3xl">
          De los 12 grupos, avanzan los 8 mejores terceros lugares. Esta sección los calcula dinámicamente según los puntajes de grupo que vayas ingresando abajo. Selecciona los 8 oficiales para armar los cruces de Dieciseisavos de Final.
        </p>

        {calculatedThirds.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-center gap-3">
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span>Ingresa primero resultados en la Fase de Grupos oficial para calcular y mostrar los terceros lugares.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400 pb-2 border-b">
              <span>Equipo Tercero del Grupo</span>
              <div className="flex gap-16 mr-4">
                <span>Tabla Posición (Pts / DG / GF)</span>
                <span>¿Clasifica Oficial?</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {calculatedThirds.map((team, idx) => {
                const isSelected = officialThirds.includes(team.teamId);
                const isHighlight = idx < 8; // Top 8 automatically suggested
                return (
                  <div
                    key={team.teamId}
                    onClick={() => handleToggleThird(team.teamId)}
                    className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : isHighlight
                        ? 'border-indigo-100 bg-indigo-50/20 hover:border-indigo-300'
                        : 'border-slate-100 hover:border-slate-300 bg-slate-50/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400">
                        G{team.groupLabel}
                      </span>
                      <TeamFlag teamId={team.teamId} className="w-6 h-4" />
                      <span className="font-semibold text-sm">{team.teamName}</span>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className="font-mono text-xs text-slate-500">
                        {team.points} pts | {team.gd > 0 ? `+${team.gd}` : team.gd} DG | {team.gf} GF
                      </span>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-emerald-500 border-emerald-600 text-white' 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2 mt-4">
              <span className={`px-2 py-0.5 rounded-full font-bold ${
                officialThirds.length === 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {officialThirds.length} / 8 Seleccionados
              </span>
              <span>(Indica los 8 terceros oficiales para poblar los espacios T1 a T8 en la bracket general).</span>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: TABLA DE PARTIDOS OFICIALES */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm" id="matches-entry-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ingreso Manual de Resultados Oficiales</h3>
            <p className="text-slate-500 text-sm">Cambiar estos campos recalcula instantáneamente los puntos de todos tus amigos.</p>
          </div>

          {/* FILTROS */}
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={filterStage}
              onChange={(e) => {
                setFilterStage(e.target.value);
                if (e.target.value !== 'group') setFilterGroup('all');
              }}
              className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {filterStage === 'group' && (
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {groups.map(g => (
                  <option key={g} value={g}>{g === 'all' ? 'Todos los Grupos' : `Grupo ${g}`}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* LISTADO DE PARTIDOS EN FILTRO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMatches.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium">
              No hay partidos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            filteredMatches.map((m) => {
              const score = tempScores[m.id] || {
                home: m.teamHomeScore !== undefined ? String(m.teamHomeScore) : '',
                away: m.teamAwayScore !== undefined ? String(m.teamAwayScore) : '',
                winnerId: m.winnerId
              };
              const isSaving = savingMatches[m.id] || false;
              
              // Bracket state tie evaluation (e.g. if the scores are equal, require selection of winner)
              const isDrawBracket = m.stage !== 'group' && score.home !== '' && score.away !== '' && Number(score.home) === Number(score.away);
              
              const isPreR32Home = m.teamHomeId.startsWith('1') || m.teamHomeId.startsWith('2') || m.teamHomeId.startsWith('T') || m.teamHomeId.startsWith('G');
              const isPreR32Away = m.teamAwayId.startsWith('1') || m.teamAwayId.startsWith('2') || m.teamAwayId.startsWith('T') || m.teamAwayId.startsWith('G');

              return (
                <div
                  key={m.id}
                  className={`p-4 border rounded-2xl transition-all ${
                    m.completed 
                      ? 'border-emerald-100 bg-emerald-50/10' 
                      : 'border-slate-100 bg-slate-50/20 hover:border-slate-200'
                  }`}
                >
                  {/* Metadata de Partido */}
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                    <span className="font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {m.stage === 'group' ? `Grupo ${m.groupLabel}` : stages.find(s => s.id === m.stage)?.name}
                    </span>
                    <span>Partido #{m.id} • {m.date} - {m.time}</span>
                  </div>

                  {/* Cuerpo Card: Equipos y Marcadores */}
                  <div className="flex items-center justify-between gap-2.5">
                    
                    {/* Home Team */}
                    <div className="flex-1 flex items-center justify-end gap-2.5 text-right">
                      <span className="font-bold text-sm text-slate-800 line-clamp-1">
                        {isPreR32Home ? m.teamHomeId : getTeamName(m.teamHomeId)}
                      </span>
                      {isPreR32Home ? (
                        <span className="text-2xl shrink-0">🌐</span>
                      ) : (
                        <TeamFlag teamId={m.teamHomeId} className="w-7 h-4.5" />
                      )}
                    </div>

                    {/* Inputs de marcador */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        placeholder="--"
                        min="0"
                        value={score.home}
                        onChange={(e) => handleScoreChange(m.id, 'home', e.target.value)}
                        className="w-12 h-10 text-center border border-slate-300 rounded-xl font-bold text-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-slate-400 font-bold">:</span>
                      <input
                        type="number"
                        placeholder="--"
                        min="0"
                        value={score.away}
                        onChange={(e) => handleScoreChange(m.id, 'away', e.target.value)}
                        className="w-12 h-10 text-center border border-slate-300 rounded-xl font-bold text-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex items-center justify-start gap-2.5 text-left">
                      {isPreR32Away ? (
                        <span className="text-2xl shrink-0">🌐</span>
                      ) : (
                        <TeamFlag teamId={m.teamAwayId} className="w-7 h-4.5" />
                      )}
                      <span className="font-bold text-sm text-slate-800 line-clamp-1">
                        {isPreR32Away ? m.teamAwayId : getTeamName(m.teamAwayId)}
                      </span>
                    </div>

                  </div>

                  {/* Detalle Estadio */}
                  <div className="text-[11px] text-slate-400 mt-2.5 text-center leading-normal">
                    {m.venue} ({m.city})
                  </div>

                  {/* Selector de ganador alternativo en caso de empate en Brackets */}
                  {isDrawBracket && (
                    <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-center">
                      <p className="text-xs font-bold text-indigo-950 mb-2">Empate en eliminatoria. ¿Quién clasifica (Penales)?</p>
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBracketWinner(m.id, m.teamHomeId)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            score.winnerId === m.teamHomeId 
                              ? 'bg-indigo-600 text-white shadow-sm' 
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isPreR32Home ? (
                            <span className="text-sm">🌐</span>
                          ) : (
                            <TeamFlag teamId={m.teamHomeId} className="w-5 h-3.5" />
                          )}
                          <span>{isPreR32Home ? m.teamHomeId : getTeamName(m.teamHomeId)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBracketWinner(m.id, m.teamAwayId)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            score.winnerId === m.teamAwayId 
                              ? 'bg-indigo-600 text-white shadow-sm' 
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {isPreR32Away ? (
                            <span className="text-sm">🌐</span>
                          ) : (
                            <TeamFlag teamId={m.teamAwayId} className="w-5 h-3.5" />
                          )}
                          <span>{isPreR32Away ? m.teamAwayId : getTeamName(m.teamAwayId)}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botón de guardar para este partido */}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveMatch(m.id)}
                      className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none ${
                        m.completed
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isSaving ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : m.completed ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      {m.completed ? 'Marcado Oficial' : 'Guardar Resultado'}
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
