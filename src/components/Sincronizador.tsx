/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Match, Participant, ActivePhase } from '../types';
import { getTeamName, TEAMS } from '../data/worldCupData';
import TeamFlag from './TeamFlag';
import { getThirdPlaceTeams } from '../utils/football';
import { RefreshCw, Play, Trophy, Users, ShieldAlert, Check, HelpCircle, Save, ChevronRight } from 'lucide-react';

interface SincronizadorProps {
  officialMatches: Match[];
  officialThirds: string[];
  participants: Participant[];
  onUpdateMatch: (matchId: number, home: number | undefined, away: number | undefined, completed: boolean, winnerId?: string, penaltyHome?: number, penaltyAway?: number) => Promise<void>;
  onUpdateThirds: (thirds: string[]) => Promise<void>;
  onResetAll: () => Promise<void>;
  onSeedData: () => void;
  predictionsClosed: boolean;
  onTogglePredictionsClosed: (closed: boolean) => Promise<void>;
  activePhase: ActivePhase;
  onAdvancePhase: (phase: ActivePhase) => Promise<void>;
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
  activePhase,
  onAdvancePhase,
}: SincronizadorProps) {
  const [filterStage, setFilterStage] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [savingMatches, setSavingMatches] = useState<{ [id: number]: boolean }>({});
  const [tempScores, setTempScores] = useState<{ [id: number]: { home: string; away: string; winnerId?: string; penaltyHome?: string; penaltyAway?: string } }>({});
  const [advancingPhase, setAdvancingPhase] = useState<boolean>(false);

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

  const phaseOrder: ActivePhase[] = ['group', 'r32', 'r16', 'qf', 'sf', 'final'];
  const phaseLabel: Record<ActivePhase, string> = {
    group: 'Fase de Grupos',
    r32: 'Dieciseisavos de Final',
    r16: 'Octavos de Final',
    qf: 'Cuartos de Final',
    sf: 'Semifinales',
    final: 'Final'
  };

  const nextPhase = (): ActivePhase | null => {
    const idx = phaseOrder.indexOf(activePhase);
    return idx < phaseOrder.length - 1 ? phaseOrder[idx + 1] : null;
  };

  const handleAdvancePhase = async () => {
    const next = nextPhase();
    if (!next) return;
    if (!confirm(`¿Estás seguro de avanzar a ${phaseLabel[next]}? Esto abrirá la quiniela para que los participantes completen sus predicciones.`)) return;
    setAdvancingPhase(true);
    try {
      await onAdvancePhase(next);
    } finally {
      setAdvancingPhase(false);
    }
  };

  const getInitialTemp = (matchId: number) => {
    const m = officialMatches.find(x => x.id === matchId);
    return {
      home: m?.teamHomeScore !== undefined ? String(m.teamHomeScore) : '',
      away: m?.teamAwayScore !== undefined ? String(m.teamAwayScore) : '',
      winnerId: m?.winnerId,
      penaltyHome: m?.penaltyHomeScore !== undefined ? String(m.penaltyHomeScore) : '',
      penaltyAway: m?.penaltyAwayScore !== undefined ? String(m.penaltyAwayScore) : '',
    };
  };

  const handleScoreChange = (matchId: number, side: 'home' | 'away', val: string) => {
    const current = tempScores[matchId] || getInitialTemp(matchId);
    setTempScores({ ...tempScores, [matchId]: { ...current, [side]: val } });
  };

  const handlePenaltyChange = (matchId: number, side: 'penaltyHome' | 'penaltyAway', val: string) => {
    const current = tempScores[matchId] || getInitialTemp(matchId);
    setTempScores({ ...tempScores, [matchId]: { ...current, [side]: val } });
  };

  const setBracketWinner = (matchId: number, winnerId: string) => {
    const current = tempScores[matchId] || getInitialTemp(matchId);
    setTempScores({ ...tempScores, [matchId]: { ...current, winnerId } });
  };

  const handleSaveMatch = async (matchId: number) => {
    const match = officialMatches.find(m => m.id === matchId);
    if (!match) return;
    setSavingMatches(prev => ({ ...prev, [matchId]: true }));
    try {
      const temp = tempScores[matchId] || getInitialTemp(matchId);
      const homeVal = temp.home;
      const awayVal = temp.away;
      const winnerId = temp.winnerId;
      const penaltyHome = temp.penaltyHome !== '' && temp.penaltyHome !== undefined ? Number(temp.penaltyHome) : undefined;
      const penaltyAway = temp.penaltyAway !== '' && temp.penaltyAway !== undefined ? Number(temp.penaltyAway) : undefined;

      if (homeVal.trim() === '' || awayVal.trim() === '') {
        await onUpdateMatch(matchId, undefined, undefined, false, undefined, undefined, undefined);
      } else {
        await onUpdateMatch(matchId, Number(homeVal), Number(awayVal), true, winnerId, penaltyHome, penaltyAway);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMatches(prev => ({ ...prev, [matchId]: false }));
    }
  };

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

  const filteredMatches = officialMatches.filter(m => {
    const matchesStage = filterStage === 'all' || m.stage === filterStage;
    const matchesGroup = filterGroup === 'all' || (m.stage === 'group' && m.groupLabel === filterGroup);
    return matchesStage && matchesGroup;
  });

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

  const pendingCount = participants.filter(p => !p.completedPhases?.includes(activePhase)).length;

  return (
    <div className="space-y-8" id="sincronizador-tab">

      {/* SECCIÓN 1: CARDS SUPERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* REGLAMENTO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
                <Trophy className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-wide">Reglamento de Puntaje</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Los puntos se calculan automáticamente para todos los jugadores cuando ingresas un resultado oficial.
            </p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">5</span>
                <div>
                  <p className="font-semibold text-slate-100">Empate Exacto + Penales</p>
                  <p className="text-xs text-slate-400">Acierta el empate exacto y el ganador en penales.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</span>
                <div>
                  <p className="font-semibold text-slate-100">Acierto Exacto</p>
                  <p className="text-xs text-slate-400">Marcador exacto, o empate exacto sin acertar penales.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</span>
                <div>
                  <p className="font-semibold text-slate-100">Acierto de Ganador</p>
                  <p className="text-xs text-slate-400">Acierta el ganador final pero no el marcador exacto.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">0</span>
                <div>
                  <p className="font-semibold text-slate-100">Error</p>
                  <p className="text-xs text-slate-400">No acierta nada.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-500 flex items-center gap-1.5 mt-4">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>En eliminatorias con empate, ingresa el resultado de penales.</span>
          </div>
        </div>

        {/* MÉTRICAS Y CIERRE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className={`p-2 rounded-xl ${predictionsClosed ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                {predictionsClosed ? <ShieldAlert className="w-5 h-5" /> : <Users className="w-5 h-5" />}
              </span>
              <h3 className="text-lg font-semibold tracking-wide">Control de Quiniela</h3>
            </div>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              {predictionsClosed
                ? 'La quiniela está CERRADA. Ningún usuario puede ingresar predicciones.'
                : 'La quiniela está ABIERTA. Los participantes pueden registrar predicciones.'}
            </p>
            <div className="space-y-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Estado:</span>
                <span className={`font-bold uppercase ${predictionsClosed ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {predictionsClosed ? '🔒 CERRADA' : '🔓 ABIERTA'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Fase activa:</span>
                <span className="font-semibold text-indigo-300">{phaseLabel[activePhase]}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Total participantes:</span>
                <span className="font-semibold text-white">{participants.length} registrados</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Partidos completados:</span>
                <span className="font-semibold text-white">
                  {officialMatches.filter(m => m.completed).length} / {officialMatches.length}
                </span>
              </div>
              {activePhase !== 'group' && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Pendientes {phaseLabel[activePhase]}:</span>
                  <span className={`font-semibold ${pendingCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {pendingCount} participantes
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800/80 mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onTogglePredictionsClosed(!predictionsClosed)}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5 focus:outline-none ${predictionsClosed
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                }`}
            >
              {predictionsClosed ? <><RefreshCw className="w-3.5 h-3.5" /> Reabrir Quiniela</> : <><ShieldAlert className="w-3.5 h-3.5" /> Cerrar Quiniela (Bloquear)</>}
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

        {/* AVANZAR FASE Y ADMIN */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-indigo-500/15 text-indigo-400 rounded-xl">
                <ChevronRight className="w-5 h-5" />
              </span>
              <h3 className="text-lg font-semibold tracking-wide">Avanzar Fase</h3>
            </div>
            <p className="text-slate-400 text-sm mb-4 leading-relaxed">
              Cuando hayas ingresado todos los resultados de <strong className="text-white">{phaseLabel[activePhase]}</strong>, avanza a la siguiente fase.
            </p>
            {nextPhase() ? (
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Fase actual:</span>
                  <span className="font-semibold text-white">{phaseLabel[activePhase]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Siguiente fase:</span>
                  <span className="font-semibold text-indigo-300">{phaseLabel[nextPhase()!]}</span>
                </div>
                {activePhase !== 'group' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Completaron fase:</span>
                    <span className={`font-semibold ${pendingCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {participants.length - pendingCount} / {participants.length}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-xs text-emerald-400 font-semibold text-center">
                🏆 ¡Estás en la fase final del torneo!
              </div>
            )}
          </div>
          <div className="pt-4 border-t border-slate-800/80 mt-4 flex flex-col gap-2">
            {nextPhase() && (
              <button
                type="button"
                disabled={advancingPhase}
                onClick={handleAdvancePhase}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-black tracking-tight transition-all flex items-center justify-center gap-1.5 focus:outline-none bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              >
                {advancingPhase ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Avanzar a {nextPhase() ? phaseLabel[nextPhase()!] : ''}
              </button>
            )}
            <button
              onClick={() => {
                if (confirm("¿Estás absolutamente seguro de que deseas borrar todos los participantes y limpiar los resultados? Esta acción es irreversible.")) {
                  onResetAll();
                }
              }}
              className="w-full py-2.5 px-4 bg-rose-600/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-800/50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Resetear Quiniela Completa
            </button>
          </div>
        </div>

      </div>

      {/* SECCIÓN 2: MEJORES TERCEROS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-2">Paso Especial: Los 8 Mejores Terceros Oficiales</h3>
        <p className="text-slate-500 text-sm mb-6 max-w-3xl">
          De los 12 grupos, avanzan los 8 mejores terceros lugares. Selecciona los 8 oficiales para armar los cruces de Dieciseisavos de Final.
        </p>
        {calculatedThirds.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex items-center gap-3">
            <HelpCircle className="w-5 h-5 shrink-0" />
            <span>Ingresa primero resultados en la Fase de Grupos para calcular los terceros lugares.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold uppercase text-slate-400 pb-2 border-b">
              <span>Equipo Tercero del Grupo</span>
              <div className="flex gap-16 mr-4">
                <span>Pts / DG / GF</span>
                <span>¿Clasifica?</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {calculatedThirds.map((team, idx) => {
                const isSelected = officialThirds.includes(team.teamId);
                const isHighlight = idx < 8;
                return (
                  <div
                    key={team.teamId}
                    onClick={() => handleToggleThird(team.teamId)}
                    className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                        : isHighlight ? 'border-indigo-100 bg-indigo-50/20 hover:border-indigo-300'
                          : 'border-slate-100 hover:border-slate-300 bg-slate-50/10'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-400">G{team.groupLabel}</span>
                      <TeamFlag teamId={team.teamId} className="w-6 h-4" />
                      <span className="font-semibold text-sm">{team.teamName}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-mono text-xs text-slate-500">
                        {team.points} pts | {team.gd > 0 ? `+${team.gd}` : team.gd} DG | {team.gf} GF
                      </span>
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-emerald-500 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-4">
              <span className={`px-2 py-0.5 rounded-full font-bold ${officialThirds.length === 8 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {officialThirds.length} / 8 Seleccionados
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: PARTIDOS OFICIALES */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ingreso Manual de Resultados Oficiales</h3>
            <p className="text-slate-500 text-sm">Cambiar estos campos recalcula instantáneamente los puntos de todos tus amigos.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <select
              value={filterStage}
              onChange={(e) => { setFilterStage(e.target.value); if (e.target.value !== 'group') setFilterGroup('all'); }}
              className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {filterStage === 'group' && (
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="py-2.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {groups.map(g => <option key={g} value={g}>{g === 'all' ? 'Todos los Grupos' : `Grupo ${g}`}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredMatches.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium">
              No hay partidos que coincidan con los filtros seleccionados.
            </div>
          ) : (
            filteredMatches.map((m) => {
              const score = tempScores[m.id] || getInitialTemp(m.id);
              const isSaving = savingMatches[m.id] || false;
              const isDrawBracket = m.stage !== 'group' && score.home !== '' && score.away !== '' && Number(score.home) === Number(score.away);
              const isPreR32Home = !TEAMS.some(t => t.id === m.teamHomeId);
              const isPreR32Away = !TEAMS.some(t => t.id === m.teamAwayId);

              return (
                <div key={m.id} className={`p-4 border rounded-2xl transition-all ${m.completed ? 'border-emerald-100 bg-emerald-50/10' : 'border-slate-100 bg-slate-50/20 hover:border-slate-200'}`}>

                  {/* Header */}
                  <div className="flex justify-between items-center text-xs text-slate-400 mb-3">
                    <span className="font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {m.stage === 'group' ? `Grupo ${m.groupLabel}` : stages.find(s => s.id === m.stage)?.name}
                    </span>
                    <span>Partido #{m.id} • {m.date} - {m.time}</span>
                  </div>

                  {/* Equipos y marcador */}
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex-1 flex items-center justify-end gap-2.5 text-right">
                      <span className="font-bold text-sm text-slate-800 line-clamp-1">{isPreR32Home ? m.teamHomeId : getTeamName(m.teamHomeId)}</span>
                      {isPreR32Home ? <span className="text-2xl shrink-0">🌐</span> : <TeamFlag teamId={m.teamHomeId} className="w-7 h-4.5" />}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input type="number" placeholder="--" min="0" value={score.home} onChange={(e) => handleScoreChange(m.id, 'home', e.target.value)} className="w-12 h-10 text-center border border-slate-300 rounded-xl font-bold text-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="text-slate-400 font-bold">:</span>
                      <input type="number" placeholder="--" min="0" value={score.away} onChange={(e) => handleScoreChange(m.id, 'away', e.target.value)} className="w-12 h-10 text-center border border-slate-300 rounded-xl font-bold text-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div className="flex-1 flex items-center justify-start gap-2.5 text-left">
                      {isPreR32Away ? <span className="text-2xl shrink-0">🌐</span> : <TeamFlag teamId={m.teamAwayId} className="w-7 h-4.5" />}
                      <span className="font-bold text-sm text-slate-800 line-clamp-1">{isPreR32Away ? m.teamAwayId : getTeamName(m.teamAwayId)}</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-2.5 text-center">{m.venue} ({m.city})</div>

                  {/* Panel de penales — aparece cuando hay empate en bracket */}
                  {isDrawBracket && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
                      <p className="text-xs font-bold text-amber-900 text-center">⚽ Empate — Ingresa el resultado de penales</p>

                      {/* Marcador de penales */}
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-amber-700 font-semibold">{isPreR32Home ? m.teamHomeId : getTeamName(m.teamHomeId)}</span>
                          <input
                            type="number"
                            placeholder="--"
                            min="0"
                            value={score.penaltyHome ?? ''}
                            onChange={(e) => handlePenaltyChange(m.id, 'penaltyHome', e.target.value)}
                            className="w-12 h-10 text-center border border-amber-300 rounded-xl font-bold text-lg text-amber-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <span className="text-amber-600 font-extrabold text-lg mt-4">:</span>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[10px] text-amber-700 font-semibold">{isPreR32Away ? m.teamAwayId : getTeamName(m.teamAwayId)}</span>
                          <input
                            type="number"
                            placeholder="--"
                            min="0"
                            value={score.penaltyAway ?? ''}
                            onChange={(e) => handlePenaltyChange(m.id, 'penaltyAway', e.target.value)}
                            className="w-12 h-10 text-center border border-amber-300 rounded-xl font-bold text-lg text-amber-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-600 text-center">El equipo con más penales classifica automáticamente.</p>
                    </div>
                  )}

                  {/* Botón guardar */}
                  <div className="mt-3 flex justify-end">
                    <button type="button" disabled={isSaving} onClick={() => handleSaveMatch(m.id)} className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none ${m.completed ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}>
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : m.completed ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
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
