/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Participant, Match, ActivePhase } from '../types';
import { Search, Trophy, Eye, ChevronRight } from 'lucide-react';

interface LeaderboardProps {
  participants: Participant[];
  officialMatches: Match[];
  activePhase: ActivePhase;
  onSelectParticipantForView: (participant: Participant) => void;
  onSelectParticipantForPrediction: (participant: Participant) => void;
}

export default function Leaderboard({
  participants,
  officialMatches,
  activePhase,
  onSelectParticipantForView,
  onSelectParticipantForPrediction,
}: LeaderboardProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const sortedParticipants = [...participants].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
    if (b.outcomeCount !== a.outcomeCount) return b.outcomeCount - a.outcomeCount;
    return a.name.localeCompare(b.name);
  });

  const filteredParticipants = sortedParticipants.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const phaseLabel: Record<ActivePhase, string> = {
    group: 'Fase de Grupos',
    r32: 'Dieciseisavos',
    r16: 'Octavos',
    qf: 'Cuartos',
    sf: 'Semifinales',
    final: 'Final'
  };

  const hasCompletedPhase = (p: Participant) => p.completedPhases?.includes(activePhase) ?? false;
  const showPredictionButton = activePhase !== 'group';

  const getRankEmoji = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return null;
  };

  const getAvatarColors = (idx: number) => {
    if (idx === 0) return 'bg-amber-100 text-amber-800';
    if (idx === 1) return 'bg-slate-200 text-slate-800';
    if (idx === 2) return 'bg-orange-100 text-orange-800';
    return 'bg-indigo-50 text-indigo-700';
  };

  return (
    <div className="space-y-6" id="leaderboard-tab">

      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-100">Tabla de Líderes</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Clasificación General Compartida</h2>
          <p className="text-emerald-100 text-xs mt-1 max-w-xl">
            Fase activa: <strong>{phaseLabel[activePhase]}</strong>
            {showPredictionButton && ' — Cada participante debe completar sus predicciones para esta fase.'}
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 scale-150">
          <Trophy className="w-64 h-64" />
        </div>
      </div>

      {/* Banner aviso fase */}
      {showPredictionButton && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3">
          <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-indigo-900">Nueva fase disponible: {phaseLabel[activePhase]}</p>
            <p className="text-xs text-indigo-600 mt-0.5">Cada participante debe presionar "Completar" para ingresar sus pronósticos.</p>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar amigo por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Mostrando {filteredParticipants.length} de {participants.length} participantes
        </span>
      </div>

      {/* Lista */}
      {filteredParticipants.length === 0 ? (
        <div className="py-20 text-center text-slate-400 font-medium bg-white border border-slate-100 rounded-3xl">
          {searchTerm ? 'No se encontraron amigos con ese nombre.' : 'Aún no hay participantes registrados.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredParticipants.map((p, idx) => {
            const completed = hasCompletedPhase(p);
            const rankEmoji = getRankEmoji(idx);

            return (
              <div
                key={p.id}
                className={`bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all ${idx === 0 ? 'border-amber-200 ring-2 ring-amber-100'
                    : idx === 1 ? 'border-slate-200'
                      : idx === 2 ? 'border-orange-200'
                        : 'border-slate-100'
                  }`}
              >
                {/* VISTA DESKTOP — fila horizontal */}
                <div className="hidden md:flex items-center gap-4 px-6 py-4">

                  {/* Puesto */}
                  <div className="w-10 flex items-center justify-center shrink-0">
                    {rankEmoji ? (
                      <span className="text-2xl">{rankEmoji}</span>
                    ) : (
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColors(idx)}`}>
                        {idx + 1}
                      </span>
                    )}
                  </div>

                  {/* Nombre */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${getAvatarColors(idx)}`}>
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <span className="text-slate-900 font-bold block truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {showPredictionButton ? (
                          completed
                            ? <span className="text-emerald-600 font-semibold">✓ {phaseLabel[activePhase]} completado</span>
                            : <span className="text-rose-500 font-semibold">⚠ Pendiente: {phaseLabel[activePhase]}</span>
                        ) : (
                          `Unido el ${new Date(p.createdAt).toLocaleDateString()}`
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Exactos */}
                  <div className="w-32 text-center">
                    <span className="font-mono font-semibold text-emerald-600 text-lg">{p.exactCount}</span>
                    <span className="text-[10px] text-slate-400 block">Score Exacto</span>
                  </div>

                  {/* Aciertos */}
                  <div className="w-32 text-center">
                    <span className="font-mono font-semibold text-indigo-600 text-lg">{p.outcomeCount}</span>
                    <span className="text-[10px] text-slate-400 block">Ganador</span>
                  </div>

                  {/* Puntos */}
                  <div className="w-28 text-center">
                    <span className="px-3 py-1 bg-slate-950 text-white rounded-full font-extrabold text-base tracking-tight font-mono">
                      {p.totalPoints}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">pts</span>
                  </div>

                  {/* Botones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {showPredictionButton && !completed && (
                      <button
                        type="button"
                        onClick={() => onSelectParticipantForPrediction(p)}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1"
                      >
                        <ChevronRight className="w-3.5 h-3.5" /> Completar
                      </button>
                    )}
                    {showPredictionButton && completed && (
                      <span className="py-1.5 px-3 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold inline-flex items-center gap-1">
                        ✓ Listo
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectParticipantForView(p)}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-950 text-slate-600 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                  </div>

                </div>

                {/* VISTA MÓVIL — tarjeta */}
                <div className="flex md:hidden flex-col gap-3 p-4">

                  {/* Fila superior */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {rankEmoji ? (
                          <span className="text-2xl">{rankEmoji}</span>
                        ) : (
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColors(idx)}`}>
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-900 font-black text-base block leading-tight">{p.name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {showPredictionButton ? (
                            completed
                              ? <span className="text-emerald-600 font-semibold">✓ Completado</span>
                              : <span className="text-rose-500 font-semibold">⚠ Pendiente</span>
                          ) : (
                            `Unido el ${new Date(p.createdAt).toLocaleDateString()}`
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-2xl font-black text-slate-900 leading-none block">{p.totalPoints}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">pts</span>
                    </div>
                  </div>

                  {/* Divisor */}
                  <div className="border-t border-slate-100" />

                  {/* Fila inferior */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block">Exactos</span>
                        <span className="font-extrabold text-emerald-600 text-sm">{p.exactCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Aciertos</span>
                        <span className="font-extrabold text-indigo-600 text-sm">{p.outcomeCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {showPredictionButton && !completed && (
                        <button
                          type="button"
                          onClick={() => onSelectParticipantForPrediction(p)}
                          className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1"
                        >
                          <ChevronRight className="w-3.5 h-3.5" /> Completar
                        </button>
                      )}
                      {showPredictionButton && completed && (
                        <span className="py-1.5 px-3 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold">✓ Listo</span>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectParticipantForView(p)}
                        className="py-1.5 px-3 bg-slate-100 hover:bg-slate-950 text-slate-600 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
