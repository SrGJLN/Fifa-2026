/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Match, MatchPick, Participant } from './types';
import { ALL_INITIAL_MATCHES } from './data/worldCupData';
import GroupStage from './components/GroupStage';
import BracketStage from './components/BracketStage';
import Leaderboard from './components/Leaderboard';
import Sincronizador from './components/Sincronizador';
import OfficialStandings from './components/OfficialStandings';
import {
  Trophy,
  Share2,
  CheckCircle,
  UserPlus,
  User,
  X,
  ChevronRight,
  Save,
  Lock,
  LockOpen,
  RefreshCw,
  AlertCircle,
  Trophy as CupIcon
} from 'lucide-react';

export default function App() {
  // Navigation active tab: 'quiniela' | 'leaderboard' | 'sincronizador'
  const [activeTab, setActiveTab] = useState<'quiniela' | 'leaderboard' | 'sincronizador'>('quiniela');

  // Quiniela sub-view: 'group' | 'bracket'
  const [quinielaSubView, setQuinielaSubView] = useState<'group' | 'bracket'>('group');

  // Backend state
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [officialMatches, setOfficialMatches] = useState<Match[]>([]);
  const [officialThirds, setOfficialThirds] = useState<string[]>([]);
  const [predictionsClosed, setPredictionsClosed] = useState<boolean>(false);
  const [loadingState, setLoadingState] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Local (current user) state
  const [userName, setUserName] = useState<string>('');
  const [userGroupPicks, setUserGroupPicks] = useState<{ [matchId: number]: MatchPick }>({});
  const [userBracketPicks, setUserBracketPicks] = useState<{ [matchId: number]: MatchPick }>({});
  const [userSelectedThirds, setUserSelectedThirds] = useState<string[]>([]);

  const [isSavedLocally, setIsSavedLocally] = useState<boolean>(false);
  const [shareSuccess, setShareSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Comparison / Read-only detail mode state
  const [compareParticipant, setCompareParticipant] = useState<Participant | null>(null);

  // Load from database state on init
  const fetchState = async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Error al conectar con la base de datos');
      const data = await res.json();
      setParticipants(data.participants || []);
      setOfficialMatches(data.officialMatches || []);
      setOfficialThirds(data.officialThirds || []);
      setPredictionsClosed(data.predictionsClosed || false);
    } catch (e) {
      console.error(e);
      setErrorText('No se pudo establecer conexión con el servidor. Se cargará un estado desconectado.');
      // Offline safety fallback
      setOfficialMatches(ALL_INITIAL_MATCHES);
    } finally {
      setLoadingState(false);
    }
  };

  useEffect(() => {
    fetchState();

    // Recover local draft if any exists in localStorage
    const savedName = localStorage.getItem('quiniela_userName');
    const savedGroup = localStorage.getItem('quiniela_groupPicks');
    const savedBracket = localStorage.getItem('quiniela_bracketPicks');
    const savedThirds = localStorage.getItem('quiniela_selectedThirds');
    const savedSuccess = localStorage.getItem('quiniela_hasSaved');

    if (savedName) setUserName(savedName);
    if (savedGroup) setUserGroupPicks(JSON.parse(savedGroup));
    if (savedBracket) setUserBracketPicks(JSON.parse(savedBracket));
    if (savedThirds) setUserSelectedThirds(JSON.parse(savedThirds));
    if (savedSuccess) setIsSavedLocally(true);
  }, []);

  // Save drafts locally
  const persistDraftToStorage = (
    name: string,
    groups: { [id: number]: MatchPick },
    brackets: { [id: number]: MatchPick },
    thirds: string[]
  ) => {
    localStorage.setItem('quiniela_userName', name);
    localStorage.setItem('quiniela_groupPicks', JSON.stringify(groups));
    localStorage.setItem('quiniela_bracketPicks', JSON.stringify(brackets));
    localStorage.setItem('quiniela_selectedThirds', JSON.stringify(thirds));
  };

  // Updaters for user's picks
  const handleGroupPickChange = (matchId: number, homeGoals: number | undefined, awayGoals: number | undefined) => {
    const nextGroup = {
      ...userGroupPicks,
      [matchId]: { teamHomeGoals: homeGoals, teamAwayGoals: awayGoals }
    };
    setUserGroupPicks(nextGroup);
    persistDraftToStorage(userName, nextGroup, userBracketPicks, userSelectedThirds);
  };

  const handleBracketPickChange = (matchId: number, homeGoals: number | undefined, awayGoals: number | undefined, winnerId?: string) => {
    const nextBracket = {
      ...userBracketPicks,
      [matchId]: { teamHomeGoals: homeGoals, teamAwayGoals: awayGoals, winnerId }
    };
    setUserBracketPicks(nextBracket);
    persistDraftToStorage(userName, userGroupPicks, nextBracket, userSelectedThirds);
  };

  const handleSelectedThirdsChange = (thirds: string[]) => {
    setUserSelectedThirds(thirds);
    persistDraftToStorage(userName, userGroupPicks, userBracketPicks, thirds);
  };

  // Submit picks to the global leaderboard
  const handleSubmitPredictions = async () => {
    if (predictionsClosed) {
      alert('La quiniela está cerrada. No se pueden registrar más predicciones.');
      return;
    }
    if (userName.trim() === '') {
      alert('Por favor ingresa un nombre o apodo para registrar tu quiniela.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          groupPicks: userGroupPicks,
          bracketPicks: userBracketPicks,
          selectedThirds: userSelectedThirds,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al guardar la predicción.');
      }

      const data = await res.json();
      setParticipants(prev => [...prev, data.participant]);

      // Notify success
      alert(`¡Felicidades, ${userName}! Tu quiniela ha sido registrada con éxito y ya figuras en la Tabla General.`);

      // Clear current quiniela states so the next user/friend can enter their predictions
      setUserName('');
      setUserGroupPicks({});
      setUserBracketPicks({});
      setUserSelectedThirds([]);
      setIsSavedLocally(false);

      // Clean local storage draft fields
      localStorage.removeItem('quiniela_userName');
      localStorage.removeItem('quiniela_groupPicks');
      localStorage.removeItem('quiniela_bracketPicks');
      localStorage.removeItem('quiniela_selectedThirds');
      localStorage.removeItem('quiniela_hasSaved');

      // Go to leaderboard tab to show their newly added score
      setActiveTab('leaderboard');
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Error al conectar con la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Admin APIs hook
  const handleUpdateOfficialMatch = async (
    matchId: number,
    teamHomeScore: number | undefined,
    teamAwayScore: number | undefined,
    completed: boolean,
    winnerId?: string
  ) => {
    try {
      const res = await fetch('/api/official/update-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchId, teamHomeScore, teamAwayScore, completed, winnerId }),
      });
      if (!res.ok) throw new Error('No se pudo guardar la posición oficial.');
      const data = await res.json();
      setOfficialMatches(data.officialMatches);
      setParticipants(prev => [...prev, data.participant]);
      setOfficialThirds(data.officialThirds);
    } catch (e) {
      console.error(e);
      alert('Error de conexión al guardar el resultado.');
    }
  };

  const handleUpdateOfficialThirds = async (thirds: string[]) => {
    try {
      const res = await fetch('/api/official/update-thirds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ officialThirds: thirds }),
      });
      if (!res.ok) throw new Error('No se pudieron actualizar los terceros oficiales.');
      const data = await res.json();
      setOfficialMatches(data.officialMatches);
      setParticipants(prev => [...prev, data.participant]);
      setOfficialThirds(data.officialThirds);
    } catch (e) {
      console.error(e);
      alert('Error de conexión al actualizar los terceros.');
    }
  };

  const handleResetAll = async () => {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) throw new Error('No se pudo resetear.');
      const data = await res.json();
      setParticipants([]);
      setOfficialMatches(data.officialMatches);
      setOfficialThirds(data.officialThirds);
      setPredictionsClosed(data.predictionsClosed || false);

      // Clear local storage too
      localStorage.clear();
      setUserName('');
      setUserGroupPicks({});
      setUserBracketPicks({});
      setUserSelectedThirds([]);
      setIsSavedLocally(false);
      alert('Se ha reiniciado completamente la quiniela en el servidor y tu borrador de navegador.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePredictionsClosed = async (closed: boolean) => {
    try {
      const res = await fetch('/api/predictions/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ closed }),
      });
      if (!res.ok) throw new Error('No se pudo cambiar el estado de cierre de la quiniela.');
      const data = await res.json();
      setPredictionsClosed(data.predictionsClosed);
    } catch (e) {
      console.error(e);
      alert('Error de conexión al modificar el estado de cierre.');
    }
  };

  // Seed demo participants for simulation testing
  const handleSeedMockData = async () => {
    const demos = [
      { name: 'Gabriel (Demo 🥇)', ratio: 0.9 },
      { name: 'Sofia (Demo 🥈)', ratio: 0.75 },
      { name: 'Lucas (Demo 🥉)', ratio: 0.6 },
      { name: 'Camila (Demo)', ratio: 0.4 },
      { name: 'Enzo (Demo)', ratio: 0.2 },
    ];

    try {
      for (const d of demos) {
        // Genera picks basados en la fase de grupos oficial (de forma aproximada para darles puntos variados!)
        const fakeGroup: { [mId: number]: MatchPick } = {};
        const fakeBracket: { [mId: number]: MatchPick } = {};

        officialMatches.forEach(m => {
          const isGroupM = m.stage === 'group';
          // Seamos consistentes con el ratio para simular exactitud
          const roll = Math.random();
          let goalsH = Math.floor(Math.random() * 4);
          let goalsA = Math.floor(Math.random() * 4);

          if (roll < d.ratio && m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined) {
            // Predict exact score
            goalsH = m.teamHomeScore;
            goalsA = m.teamAwayScore;
          } else if (roll < d.ratio + 0.15 && m.completed && m.teamHomeScore !== undefined && m.teamAwayScore !== undefined) {
            // Predict winner correctly but not exact
            const trend = m.teamHomeScore > m.teamAwayScore ? 'home' : m.teamHomeScore < m.teamAwayScore ? 'away' : 'draw';
            if (trend === 'home') {
              goalsH = m.teamHomeScore + 1;
              goalsA = m.teamHomeScore;
            } else if (trend === 'away') {
              goalsH = m.teamAwayScore;
              goalsA = m.teamAwayScore + 1;
            } else {
              goalsH = m.teamHomeScore + 1;
              goalsA = m.teamHomeScore + 1;
            }
          }

          if (isGroupM) {
            fakeGroup[m.id] = { teamHomeGoals: goalsH, teamAwayGoals: goalsA };
          } else {
            fakeBracket[m.id] = { teamHomeGoals: goalsH, teamAwayGoals: goalsA };
          }
        });

        // Post to server
        await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: d.name,
            groupPicks: fakeGroup,
            bracketPicks: fakeBracket,
            selectedThirds: ['CZE', 'JPN', 'CMR', 'POL', 'SUI', 'SEN', 'UKR', 'ALG'].slice(0, 8),
          }),
        });
      }

      await fetchState();
      alert('¡Se han sembrado 5 amigos ficticios con predicciones variadas con éxito! Checa la Tabla General.');
    } catch (e) {
      console.error(e);
    }
  };

  // Invite friends logic (copiar link al portapapeles)
  const handleCopyInviteLink = () => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`¡Te invito a jugar a mi Quiniela del Mundial 2026! Entra aquí, llena tus predicciones de todo el fixture desde grupos hasta la final en tu celular y compitamos: ${origin}`);
    setShareSuccess(true);
    setTimeout(() => setShareSuccess(false), 3000);
  };

  // Check state counts
  const groupMatches = officialMatches.filter(m => m.stage === 'group');
  const bracketMatches = officialMatches.filter(m => m.stage !== 'group');

  const filledGroupPicksCount = groupMatches.filter(
    m => userGroupPicks[m.id]?.teamHomeGoals !== undefined && userGroupPicks[m.id]?.teamAwayGoals !== undefined
  ).length;

  const isGroupStageFullyFilled = filledGroupPicksCount === groupMatches.length;

  // Render method
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800" id="main-application-stage">

      {/* HEADER DE LA APP */}
      <header className="bg-slate-900 border-b border-slate-800 text-white py-4 px-6 shadow-md sticky top-0 z-40" id="header-section">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-500 text-slate-950 rounded-2xl flex items-center justify-center font-extrabold shadow-md transform rotate-3">
              <Trophy className="w-5 h-5 shrink-0" />
            </span>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none text-white">QUINIELA MUNDIAL 2026</h1>
              <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-1">FIXTURE COMPLETO • COMPARTIDA</p>
            </div>
          </div>

          {/* MENÚ DE PESTAÑAS (MILARES A LA IMAGEN) */}
          <nav className="flex bg-slate-800 rounded-2xl p-1 shadow-inner" id="main-tabs-navigation">
            <button
              onClick={() => {
                setActiveTab('quiniela');
                setCompareParticipant(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none ${activeTab === 'quiniela' && !compareParticipant
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
            >
              <CupIcon className="w-3.5 h-3.5 shrink-0" /> MI QUINIELA
            </button>
            <button
              onClick={() => {
                setActiveTab('leaderboard');
                setCompareParticipant(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none ${activeTab === 'leaderboard'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" /> TABLA GENERAL
            </button>
            <button
              onClick={() => {
                setActiveTab('sincronizador');
                setCompareParticipant(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none ${activeTab === 'sincronizador'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-[spin_10s_linear_infinite]" /> SINCRONIZADOR API
            </button>
          </nav>

        </div>
      </header>

      {/* MENSAJE DE ADVERTENCIA OFFLINE SI EXISTE */}
      {errorText && (
        <div className="max-w-7xl mx-auto mt-4 px-6">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-4 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorText}</span>
          </div>
        </div>
      )}

      {/* CARGA INICIAL STATUS */}
      {loadingState ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="font-semibold text-sm">Cargando base de datos y fixture...</span>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-6 py-6" id="main-content-layout">

          <AnimatePresence mode="wait">

            {/* COMPARAR / INSPECCIONAR PREDICCIÓN DE OTRO COMPAÑERO */}
            {compareParticipant && (
              <motion.div
                key="compare-mode-wrapper"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <div className="p-4 bg-slate-900 text-white rounded-3xl border border-slate-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-extrabold text-sm text-white">
                      {compareParticipant.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-xs uppercase font-extrabold tracking-wider text-slate-400 leading-none">Viendo predicciones de:</p>
                      <h4 className="text-lg font-black mt-1 leading-none">{compareParticipant.name}</h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs text-slate-400 block">Puntaje Total</span>
                      <span className="text-xl font-black text-emerald-400">{compareParticipant.totalPoints} pts</span>
                    </div>

                    <button
                      onClick={() => setCompareParticipant(null)}
                      className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1 shrink-0"
                    >
                      <X className="w-4 h-4 shrink-0" /> Salir de Modo Inspección
                    </button>
                  </div>
                </div>

                {/* Sub-selector de vista para inspeccionar */}
                <div className="flex bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/50 max-w-sm">
                  <button
                    onClick={() => setQuinielaSubView('group')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${quinielaSubView === 'group' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Fase de Grupos (Inspección)
                  </button>
                  <button
                    onClick={() => setQuinielaSubView('bracket')}
                    className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition-all ${quinielaSubView === 'bracket' ? 'bg-slate-950 text-white' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    Fases Finales (Inspección)
                  </button>
                </div>

                {quinielaSubView === 'group' ? (
                  <GroupStage
                    groupMatches={groupMatches}
                    picks={compareParticipant.groupPicks}
                    onChangePick={() => { }}
                    readOnly={true}
                    participantName={compareParticipant.name}
                  />
                ) : (
                  <BracketStage
                    bracketMatches={bracketMatches}
                    groupMatches={groupMatches}
                    groupPicks={compareParticipant.groupPicks}
                    bracketPicks={compareParticipant.bracketPicks}
                    selectedThirds={compareParticipant.selectedThirds}
                    onChangeBracketPick={() => { }}
                    onChangeSelectedThirds={() => { }}
                    readOnly={true}
                    participantName={compareParticipant.name}
                  />
                )}
              </motion.div>
            )}

            {/* VISTA: MI QUINIELA PRINCIPAL */}
            {activeTab === 'quiniela' && !compareParticipant && (
              <motion.div
                key="quiniela-tab-wrapper"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {predictionsClosed ? (
                  <OfficialStandings groupMatches={groupMatches} />
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                      {/* Selector Sub-pestanas */}
                      <div className="flex bg-slate-250 bg-slate-200/50 rounded-2xl p-1 max-w-xs border border-slate-300/30">
                        <button
                          type="button"
                          onClick={() => setQuinielaSubView('group')}
                          className={`flex-1 py-2.5 px-4 text-center text-xs font-extrabold rounded-xl transition-all focus:outline-none ${quinielaSubView === 'group'
                            ? 'bg-slate-950 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          FASE DE GRUPOS
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuinielaSubView('bracket')}
                          className={`flex-1 py-2.5 px-4 text-center text-xs font-extrabold rounded-xl transition-all focus:outline-none ${quinielaSubView === 'bracket'
                            ? 'bg-slate-950 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                          FASES FINALES
                        </button>
                      </div>

                      {/* INDICADOR DE PROGRESO DE LLENADO */}
                      <div className="flex items-center gap-3 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm text-xs max-w-sm" id="progress-indicator">
                        <div className="relative w-12 h-12 flex items-center justify-center bg-emerald-50 rounded-full text-emerald-600 font-extrabold">
                          <span>{Math.round((filledGroupPicksCount / 72) * 100)}%</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">Llenado Fase de Grupos</p>
                          <p className="text-slate-400 mt-0.5 font-medium">Predicho {filledGroupPicksCount} de 72 partidos oficiales.</p>
                        </div>
                      </div>
                    </div>

                    {/* BOTÓN Y PANEL PARA SALVAGUARDAR QUINIELA (RECOGEDOR DE NOMBRE) */}
                    <div className="bg-emerald-950 text-emerald-100 p-6 rounded-3xl border border-emerald-900 shadow-xl" id="save-quiniela-action">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                          <div className="flex items-center gap-2.5 mb-1.5">
                            {isGroupStageFullyFilled ? (
                              <span className="p-1.5 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center">
                                <LockOpen className="w-4 h-4" />
                              </span>
                            ) : (
                              <span className="p-1.5 bg-emerald-150 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
                                <Lock className="w-4 h-4" />
                              </span>
                            )}
                            <h3 className="text-lg font-black tracking-tight text-white leading-none">Guardar mi Quiniela en la Tabla General</h3>
                          </div>
                          <p className="text-emerald-200 text-xs leading-relaxed max-w-2xl">
                            {isGroupStageFullyFilled
                              ? '¡Excelente! Has llenado los 72 marcadores de la fase de grupos. Escribe tu nombre o apodo abajo para registrar tu quiniela oficial en el torneo de amigos.'
                              : 'Para poder registrar tu quiniela en la Tabla General con tus amigos, debes llenar de forma completa las 72 predicciones de los partidos de la Fase de Grupos.'}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3 sm:max-w-md w-full">
                          <div className="relative w-full">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-300 w-4 h-4" />
                            <input
                              type="text"
                              disabled={!isGroupStageFullyFilled || isSavedLocally}
                              placeholder={isSavedLocally ? '¡Ya has guardado tu quiniela!' : "Escribe tu nombre o apodo..."}
                              value={userName}
                              onChange={(e) => {
                                setUserName(e.target.value);
                                persistDraftToStorage(e.target.value, userGroupPicks, userBracketPicks, userSelectedThirds);
                              }}
                              className="w-full pl-10 pr-4 py-3 bg-emerald-900/60 disabled:bg-emerald-950/20 disabled:text-emerald-500 border border-emerald-800 disabled:border-emerald-950 rounded-2xl text-sm font-semibold text-white placeholder-emerald-400/80 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleSubmitPredictions}
                            disabled={!isGroupStageFullyFilled || userName.trim() === '' || isSubmitting || isSavedLocally}
                            className="py-3 px-6 bg-emerald-500 disabled:bg-emerald-900 hover:bg-emerald-400 text-slate-950 disabled:text-emerald-500 font-extrabold rounded-2xl text-sm tracking-tight transition-all shadow-md shrink-0 w-full sm:w-auto flex items-center justify-center gap-1.5 focus:outline-none cursor-pointer"
                          >
                            {isSubmitting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : isSavedLocally ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            {isSavedLocally ? 'Registrado' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {quinielaSubView === 'group' ? (
                      <GroupStage
                        groupMatches={groupMatches}
                        picks={userGroupPicks}
                        onChangePick={handleGroupPickChange}
                        readOnly={false}
                      />
                    ) : (
                      <BracketStage
                        bracketMatches={bracketMatches}
                        groupMatches={groupMatches}
                        groupPicks={userGroupPicks}
                        bracketPicks={userBracketPicks}
                        selectedThirds={userSelectedThirds}
                        onChangeBracketPick={handleBracketPickChange}
                        onChangeSelectedThirds={handleSelectedThirdsChange}
                        readOnly={false}
                      />
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* VISTA: TABLA GENERAL */}
            {activeTab === 'leaderboard' && !compareParticipant && (
              <motion.div
                key="leaderboard-tab-wrapper"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <Leaderboard
                  participants={participants}
                  officialMatches={officialMatches}
                  onSelectParticipantForView={(p) => {
                    setCompareParticipant(p);
                  }}
                />
              </motion.div>
            )}

            {/* VISTA: SINCRONIZADOR API (ADMIN) */}
            {activeTab === 'sincronizador' && !compareParticipant && (
              <motion.div
                key="sincronizador-tab-wrapper"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                <Sincronizador
                  officialMatches={officialMatches}
                  officialThirds={officialThirds}
                  participants={participants}
                  onUpdateMatch={handleUpdateOfficialMatch}
                  onUpdateThirds={handleUpdateOfficialThirds}
                  onResetAll={handleResetAll}
                  onSeedData={handleSeedMockData}
                  predictionsClosed={predictionsClosed}
                  onTogglePredictionsClosed={handleTogglePredictionsClosed}
                />
              </motion.div>
            )}

          </AnimatePresence>

        </main>
      )}

      {/* FOOTER */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-10 mt-16 text-center text-xs font-semibold" id="footer-section">
        <div className="max-w-7xl mx-auto px-6 space-y-2">
          <p>© 2026 Quiniela de Fútbol Mundial 2026. Todos los derechos reservados.</p>
          <p className="text-[10px] text-slate-600">
            Diseñado para jugar con amigos de forma rápida y moderna. No se requiere inicio de sesión. Desarrollado en AI Studio Build.
          </p>
        </div>
      </footer>

    </div>
  );
}
