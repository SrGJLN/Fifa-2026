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

  const getRankBadge = (idx: number) => {
    if (idx === 0) return <span className="text-xl">🥇</span>;
    if (idx === 1) return <span className="text-xl">🥈</span>;
    if (idx === 2) return <span className="text-xl">🥉</span>;
    return <span className="text-sm font-semibold text-slate-500 w-6 text-center inline-block">{idx + 1}</span>;
  };

  const phaseLabel: Record<ActivePhase, string> = {
    group: 'Fase de Grupos',
    r32: 'Dieciseisavos',
    r16: 'Octavos',
    qf: 'Cuartos',
    sf: 'Semifinales',
    final: 'Final'
  };

  // Determina si un participante ya completó la fase activa
  const hasCompletedPhase = (p: Participant) => {
    return p.completedPhases?.includes(activePhase) ?? false;
  };

  const showPredictionButton = activePhase !== 'group';

  return (
    <div className="space-y-6" id="leaderboard-tab">

      {/* Banner Superior */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden" id="leaderboard-hero">
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

      {/* Banner aviso fase activa */}
      {showPredictionButton && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center gap-3">
          <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-indigo-900">Nueva fase disponible: {phaseLabel[activePhase]}</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Cada participante debe presionar "Completar predicciones" para ingresar sus pronósticos de esta fase.
              Los participantes que ya completaron aparecen marcados en verde.
            </p>
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

      {/* Tabla */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
        {filteredParticipants.length === 0 ? (
          <div className="py-20 text-center text-slate-400 font-medium">
            {searchTerm ? 'No se encontraron amigos con ese nombre.' : 'Aún no hay participantes registrados.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6 text-center w-16">Puesto</th>
                  <th className="py-4 px-6">Amigo / Jugador</th>
                  <th className="py-4 px-6 text-center">Score Exacto (x3)</th>
                  <th className="py-4 px-6 text-center">Ganador (x1)</th>
                  <th className="py-4 px-6 text-center">Puntaje Total</th>
                  <th className="py-4 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredParticipants.map((p, idx) => {
                  const isTop3 = idx < 3;
                  const completed = hasCompletedPhase(p);

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/50 transition-colors ${isTop3 ? 'font-medium bg-slate-50/20' : ''}`}
                    >
                      {/* Puesto */}
                      <td className="py-4 px-6 text-center">
                        {getRankBadge(idx)}
                      </td>

                      {/* Nombre */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-100 text-amber-800'
                              : idx === 1 ? 'bg-slate-200 text-slate-800'
                                : idx === 2 ? 'bg-orange-100 text-orange-800'
                                  : 'bg-indigo-50 text-indigo-700'
                            }`}>
                            {p.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <span className="text-slate-900 font-bold block">{p.name}</span>
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
                      </td>

                      {/* Aciertos Exactos */}
                      <td className="py-4 px-6 text-center font-mono font-semibold text-emerald-600">
                        {p.exactCount}
                      </td>

                      {/* Aciertos Simples */}
                      <td className="py-4 px-6 text-center font-mono font-semibold text-indigo-600">
                        {p.outcomeCount}
                      </td>

                      {/* Puntaje Total */}
                      <td className="py-4 px-6 text-center">
                        <span className="px-3 py-1 bg-slate-950 text-white rounded-full font-extrabold text-base tracking-tight font-mono">
                          {p.totalPoints}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Botón completar predicciones — solo en fases posteriores a grupos */}
                          {showPredictionButton && !completed && (
                            <button
                              type="button"
                              onClick={() => onSelectParticipantForPrediction(p)}
                              className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 focus:outline-none"
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
                            className="py-1.5 px-3 bg-slate-100 hover:bg-slate-950 text-slate-600 hover:text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 focus:outline-none"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
