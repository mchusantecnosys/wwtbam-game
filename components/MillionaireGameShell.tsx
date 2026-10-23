'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AnswerRecord,
  CONCEPT_TIME_SECONDS,
  Difficulty,
  GameEvaluation,
  QUESTIONS_PER_ROUND,
  Question,
  SubjectSelection,
  computeAudiencePoll,
  computeFiftyFiftyEliminated,
  evaluateAnswer,
  evaluateGameSession,
  getMillionaireMilestoneValue,
  getTimeLimitForQuestion,
  selectRoundQuestions,
} from '@/lib/game-logic';
import { DEFAULT_QUESTIONS_DB } from '@/lib/questions-db';
import { soundEngine } from '@/lib/sound-engine';
import MillionaireStageCanvas, { StageEffectTrigger } from './MillionaireStageCanvas';
import QuestionDiagramSvg from './QuestionDiagramSvg';
import QuestionBankModal from './QuestionBankModal';
import CalculationScratchpadModal from './CalculationScratchpadModal';
import {
  Award,
  Calculator,
  CheckCircle2,
  Clock,
  Database,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';

const STORAGE_KEY = 'ug_millionaire_custom_questions_v1';

export default function MillionaireGameShell() {
  // Game State Machine: 'title' | 'playing' | 'paused' | 'gameover'
  const [gameState, setGameState] = useState<'title' | 'playing' | 'paused' | 'gameover'>('title');

  // Pre-game Configuration
  const [selectedSubject, setSelectedSubject] = useState<SubjectSelection>('Todos');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('Fácil');

  // Customizable Question Database
  const [questionsDb, setQuestionsDb] = useState<Question[]>(DEFAULT_QUESTIONS_DB);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);

  // Active Round State (40 randomized questions)
  const [roundQuestions, setRoundQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [frozenEvaluation, setFrozenEvaluation] = useState<GameEvaluation | null>(null);

  // Current Question Interaction State
  const [timeLeft, setTimeLeft] = useState<number>(CONCEPT_TIME_SECONDS);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isLockedIn, setIsLockedIn] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  // Lifelines (Comodines)
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedAudience, setUsedAudience] = useState(false);
  const [usedHint, setUsedHint] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [audiencePoll, setAudiencePoll] = useState<[number, number, number, number] | null>(null);
  const [activeHintText, setActiveHintText] = useState<string | null>(null);

  // Audio & Visual Juice
  const [isMuted, setIsMuted] = useState(false);
  const [stageEffect, setStageEffect] = useState<StageEffectTrigger | null>(null);

  const questionStartTimestampRef = useRef<number>(Date.now());
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerStageEffect = useCallback((type: StageEffectTrigger['type']) => {
    setStageEffect({ id: Date.now() + Math.random(), type });
  }, []);

  // Load persisted custom questions on mount
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestionsDb(parsed);
        }
      }
    } catch {
      // fallback to DEFAULT_QUESTIONS_DB
    }
  }, []);

  const persistQuestions = useCallback((nextDb: Question[]) => {
    setQuestionsDb(nextDb);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDb));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  // Mirror gameState to document.body.dataset.state
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.dataset.state = gameState;
    }
  }, [gameState]);

  const currentQuestion: Question | undefined = roundQuestions[currentIndex];
  const maxTimeForCurrent = currentQuestion
    ? getTimeLimitForQuestion(currentQuestion)
    : CONCEPT_TIME_SECONDS;

  const resetQuestionTransientState = useCallback((nextQuestion?: Question) => {
    if (lockTimeoutRef.current) {
      clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = null;
    }
    const limit = nextQuestion ? getTimeLimitForQuestion(nextQuestion) : CONCEPT_TIME_SECONDS;
    setTimeLeft(limit);
    setSelectedOption(null);
    setIsLockedIn(false);
    setIsRevealed(false);
    setEliminatedOptions([]);
    setAudiencePoll(null);
    setActiveHintText(null);
    questionStartTimestampRef.current = Date.now();
  }, []);

  const startNewGame = useCallback(
    (subjectOverride?: SubjectSelection, difficultyOverride?: Difficulty) => {
      const sub = subjectOverride ?? selectedSubject;
      const diff = difficultyOverride ?? selectedDifficulty;

      const selected40 = selectRoundQuestions(
        questionsDb,
        sub,
        diff,
        QUESTIONS_PER_ROUND
      );

      setRoundQuestions(selected40);
      setCurrentIndex(0);
      setRecords([]);
      setFrozenEvaluation(null);
      setUsedFiftyFifty(false);
      setUsedAudience(false);
      setUsedHint(false);
      resetQuestionTransientState(selected40[0]);

      if (typeof document !== 'undefined') {
        document.body.dataset.state = 'playing';
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
      }
      setGameState('playing');
      soundEngine.playGameStart();
      triggerStageEffect('start');
    },
    [questionsDb, selectedSubject, selectedDifficulty, resetQuestionTransientState, triggerStageEffect]
  );

  // Support ?autostart=1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        startNewGame('Todos', 'Fácil');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Answer Selection & Reveal
  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (
        gameState !== 'playing' ||
        !currentQuestion ||
        isLockedIn ||
        isRevealed ||
        eliminatedOptions.includes(optionIndex)
      ) {
        return;
      }

      setSelectedOption(optionIndex);
      setIsLockedIn(true);
      soundEngine.playLockIn();
      triggerStageEffect('lock');

      const elapsedSeconds = Math.max(
        1,
        Math.round((Date.now() - questionStartTimestampRef.current) / 1000)
      );

      lockTimeoutRef.current = setTimeout(() => {
        const record = evaluateAnswer(currentQuestion, optionIndex, elapsedSeconds);
        setRecords((prev) => [...prev, record]);
        setIsLockedIn(false);
        setIsRevealed(true);

        if (record.isCorrect) {
          soundEngine.playCorrect();
          triggerStageEffect('correct');
        } else {
          soundEngine.playWrong();
          triggerStageEffect('wrong');
        }
      }, 360);
    },
    [
      gameState,
      currentQuestion,
      isLockedIn,
      isRevealed,
      eliminatedOptions,
      triggerStageEffect,
    ]
  );

  // Handle Timeout when countdown hits 0
  const handleTimeOut = useCallback(() => {
    if (!currentQuestion || isRevealed || isLockedIn) return;
    const limit = getTimeLimitForQuestion(currentQuestion);
    const record = evaluateAnswer(currentQuestion, null, limit);
    setRecords((prev) => [...prev, record]);
    setSelectedOption(null);
    setIsRevealed(true);
    soundEngine.playWrong();
    triggerStageEffect('wrong');
  }, [currentQuestion, isRevealed, isLockedIn, triggerStageEffect]);

  // 1-second Countdown Timer
  useEffect(() => {
    if (gameState !== 'playing' || isRevealed || isLockedIn || isBankOpen) {
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeOut();
          return 0;
        }
        const nextVal = prev - 1;
        if (nextVal <= 10) {
          soundEngine.playTick(true);
        } else if (nextVal % 5 === 0) {
          soundEngine.playTick(false);
        }
        return nextVal;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState, isRevealed, isLockedIn, isBankOpen, handleTimeOut]);

  // Advance to Next Question or Finish 40-Question Round
  const handleNextQuestion = useCallback(() => {
    if (!currentQuestion) return;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= roundQuestions.length) {
      const evaluation = evaluateGameSession(records, roundQuestions.length);
      setFrozenEvaluation(evaluation);
      setGameState('gameover');
      soundEngine.playGameEnd(evaluation.tier);
    } else {
      const nextQ = roundQuestions[nextIdx];
      setCurrentIndex(nextIdx);
      resetQuestionTransientState(nextQ);
      soundEngine.playQuestionReveal(nextQ.type === 'ejercicio');
    }
  }, [
    currentQuestion,
    currentIndex,
    roundQuestions,
    records,
    resetQuestionTransientState,
  ]);

  // Finish and Evaluate Round Immediately (e.g. from Pause or HUD button)
  const handleFinishAndEvaluateNow = useCallback(() => {
    const evaluation = evaluateGameSession(records, QUESTIONS_PER_ROUND);
    setFrozenEvaluation(evaluation);
    setGameState('gameover');
    soundEngine.playGameEnd(evaluation.tier);
  }, [records]);

  // Lifelines
  const handleFiftyFifty = () => {
    if (usedFiftyFifty || isRevealed || isLockedIn || !currentQuestion) return;
    const [e1, e2] = computeFiftyFiftyEliminated(currentQuestion.correctIndex);
    setEliminatedOptions([e1, e2]);
    setUsedFiftyFifty(true);
    soundEngine.playLifeline();
    triggerStageEffect('lifeline');
  };

  const handleAudiencePoll = () => {
    if (usedAudience || isRevealed || isLockedIn || !currentQuestion) return;
    const poll = computeAudiencePoll(
      currentQuestion.correctIndex,
      currentQuestion.difficulty,
      eliminatedOptions
    );
    setAudiencePoll(poll);
    setUsedAudience(true);
    soundEngine.playLifeline();
    triggerStageEffect('lifeline');
  };

  const handleAcademicHint = () => {
    if (usedHint || isRevealed || isLockedIn || !currentQuestion) return;
    const hint =
      currentQuestion.formulaOrHint ||
      `Tema: ${currentQuestion.topic}. Analiza cuidadosamente la definición clave de ${currentQuestion.subject}.`;
    setActiveHintText(hint);
    setUsedHint(true);
    soundEngine.playLifeline();
    triggerStageEffect('lifeline');
  };

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isBankOpen) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (gameState === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startNewGame();
        }
        return;
      }

      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (gameState === 'playing') setGameState('paused');
        else if (gameState === 'paused') setGameState('playing');
        return;
      }

      if (e.key.toLowerCase() === 'm') {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (e.key.toLowerCase() === 'c' && gameState === 'playing') {
        e.preventDefault();
        setIsScratchpadOpen((prev) => !prev);
        return;
      }

      if (gameState === 'playing') {
        if (!isRevealed && !isLockedIn) {
          if (e.key === '1' || e.key.toLowerCase() === 'a') handleSelectOption(0);
          if (e.key === '2' || e.key.toLowerCase() === 'b') handleSelectOption(1);
          if (e.key === '3' || e.key.toLowerCase() === 'c') handleSelectOption(2);
          if (e.key === '4' || e.key.toLowerCase() === 'd') handleSelectOption(3);
        } else if (isRevealed && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    gameState,
    isBankOpen,
    isRevealed,
    isLockedIn,
    startNewGame,
    toggleMute,
    handleSelectOption,
    handleNextQuestion,
  ]);

  // Derived Live Score Metrics
  const totalPointsSoFar = records.reduce((acc, r) => acc + r.pointsEarned, 0);
  const currentAccuracy =
    records.length > 0 ? Math.round((totalPointsSoFar / records.length) * 100) : 0;
  const projectedFinalPercentage = Math.round(
    (totalPointsSoFar / QUESTIONS_PER_ROUND) * 1000
  ) / 10;

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden select-none">
      {/* 60fps Live Studio Stage Canvas */}
      <MillionaireStageCanvas
        gameState={gameState}
        isUrgentTimer={gameState === 'playing' && !isRevealed && timeLeft <= 10}
        isExercise={currentQuestion?.type === 'ejercicio'}
        effectTrigger={stageEffect}
      />

      {/* ====================================================================
          1. TITLE SCREEN (document.body.dataset.state = 'title')
          Responsive for Mobile (scrollable flex), Laptop & Desktop PC (12-col split)
         ==================================================================== */}
      {gameState === 'title' && (
        <div className="relative z-10 w-full h-full overflow-y-auto lg:overflow-hidden flex flex-col justify-between px-4 py-4 sm:px-8 sm:py-6 lg:px-12 lg:py-8 pointer-events-auto lg:pointer-events-none">
          {/* Top Utility Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pointer-events-auto shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-300 font-medium">
              <span className="text-amber-400 font-semibold">Universidad de Guayaquil</span>
              <span>·</span>
              <span className="truncate max-w-[180px] sm:max-w-none">
                Bloque 1: Ciencia, Tecnología e Ingeniería
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBankOpen(true)}
                className="min-h-[42px] flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-semibold text-amber-200 bg-[#0d1838]/90 hover:bg-[#162552] border border-amber-500/40 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Banco de Preguntas ({questionsDb.length})</span>
              </button>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                className="min-h-[42px] min-w-[42px] flex items-center justify-center text-slate-300 hover:text-amber-300 bg-[#0d1838]/90 border border-slate-700/80 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Center Negative-Space Split: Left Emblem & Lockup / Right Configuration Deck */}
          <div className="my-2 lg:my-auto grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-8 items-center max-w-6xl mx-auto w-full">
            {/* Left 6 cols: Bespoke Inline SVG Millionaire Emblem over negative space */}
            <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left pointer-events-auto">
              <svg
                viewBox="0 0 360 150"
                className="w-44 sm:w-72 lg:w-88 h-auto mb-1.5 sm:mb-3 drop-shadow-[0_8px_24px_rgba(245,158,11,0.28)]"
                role="img"
                aria-label="Emblema ¿Quién Quiere Ser Millonario? Edición Académica"
              >
                <defs>
                  <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <linearGradient id="hexFill" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#07112e" />
                    <stop offset="50%" stopColor="#132a63" />
                    <stop offset="100%" stopColor="#07112e" />
                  </linearGradient>
                </defs>
                <circle
                  cx="180"
                  cy="75"
                  r="66"
                  fill="#07102a"
                  stroke="url(#goldRing)"
                  strokeWidth="3"
                />
                <circle
                  cx="180"
                  cy="75"
                  r="56"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeDasharray="6 4"
                />
                <polygon
                  points="180,14 235,75 180,136 125,75"
                  fill="#0b1c48"
                  stroke="url(#goldRing)"
                  strokeWidth="2"
                />
                <polygon
                  points="20,75 42,52 318,52 340,75 318,98 42,98"
                  fill="url(#hexFill)"
                  stroke="url(#goldRing)"
                  strokeWidth="2.5"
                />
                <text
                  x="180"
                  y="71"
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="13"
                  fontWeight="800"
                  letterSpacing="2.5"
                >
                  ¿QUIÉN QUIERE SER
                </text>
                <text
                  x="180"
                  y="90"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="18"
                  fontWeight="900"
                  letterSpacing="3"
                >
                  MILLONARIO?
                </text>
              </svg>

              <h1
                className="text-xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-display), sans-serif', textWrap: 'balance' }}
              >
                Desafío Académico Preuniversitario
              </h1>
              <p className="mt-1.5 sm:mt-3 text-xs sm:text-base text-slate-300 max-w-xl leading-relaxed">
                Pon a prueba tu dominio en{' '}
                <strong className="text-amber-300 font-semibold">
                  Matemáticas, Física y Lenguaje
                </strong>{' '}
                con 40 preguntas aleatorias por partida. Las preguntas de teoría otorgan{' '}
                <span className="text-sky-300 font-mono">30s</span> y los ejercicios de cálculo{' '}
                <span className="text-amber-300 font-mono">180s</span>.
              </p>

              {/* Evaluation Rules Summary Unboxed Text */}
              <div className="mt-2 sm:mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-300">
                <span>&lt; 70% Pierde</span>
                <span>·</span>
                <span className="text-emerald-300 font-medium">≥ 70% Gana el Juego</span>
                <span>·</span>
                <span className="text-amber-300 font-semibold">
                  &gt; 90% Mención Estudiante Estrella
                </span>
              </div>
            </div>

            {/* Right 6 cols: Game Setup Panel */}
            <div className="lg:col-span-6 bg-[#0a132c]/95 border border-amber-500/40 rounded-2xl p-4 sm:p-6 lg:p-7 shadow-2xl pointer-events-auto">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 sm:pb-3 mb-3 sm:mb-5">
                <h2
                  className="text-sm sm:text-lg font-bold text-white"
                  style={{ fontFamily: 'var(--font-display), sans-serif' }}
                >
                  Configuración de la Partida
                </h2>
                <span className="text-xs font-mono text-amber-400 tabular-nums">
                  40 Preguntas / Ronda
                </span>
              </div>

              {/* 1) Selección de Asignatura */}
              <div className="mb-3 sm:mb-5">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 sm:mb-2">
                  1. Escoge la Asignatura
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Todos', 'Matemáticas', 'Física', 'Lenguaje'] as SubjectSelection[]).map(
                    (subj) => {
                      const active = selectedSubject === subj;
                      return (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => setSelectedSubject(subj)}
                          className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                              : 'bg-[#0f1c3f] text-slate-200 border-slate-700/80 hover:border-amber-500/50'
                          }`}
                        >
                          {subj}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* 2) Selección de Nivel de Dificultad */}
              <div className="mb-3 sm:mb-6">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 sm:mb-2">
                  2. Nivel de Dificultad
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        level: 'Fácil' as Difficulty,
                        desc: 'Fundamentos base',
                      },
                      {
                        level: 'Difícil' as Difficulty,
                        desc: 'Problemas aplicados',
                      },
                      {
                        level: 'God Mode' as Difficulty,
                        desc: 'Reto extremo UG',
                      },
                    ] as const
                  ).map((item) => {
                    const active = selectedDifficulty === item.level;
                    return (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => setSelectedDifficulty(item.level)}
                        className={`min-h-[48px] p-2 sm:p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          active
                            ? item.level === 'God Mode'
                              ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                              : 'bg-sky-500 text-slate-950 border-sky-300 shadow-md'
                            : 'bg-[#0f1c3f] text-slate-200 border-slate-700/80 hover:border-sky-400/50'
                        }`}
                      >
                        <div className="text-xs font-bold whitespace-nowrap">{item.level}</div>
                        <div
                          className={`text-[10px] sm:text-[11px] mt-0.5 leading-tight ${
                            active ? 'text-current opacity-90' : 'text-slate-400'
                          }`}
                        >
                          {item.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3) Resumen de Reglas Activas */}
              <div className="mb-3.5 sm:mb-6 p-2.5 sm:p-3 rounded-xl bg-[#070e22] border border-slate-800/90 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400">Ronda Completa</div>
                  <div className="text-xs sm:text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                    40 Preguntas
                  </div>
                </div>
                <div className="border-x border-slate-800 px-1 sm:px-2">
                  <div className="text-[10px] sm:text-[11px] text-slate-400">Teoría</div>
                  <div className="text-xs sm:text-sm font-bold text-sky-400 font-mono tabular-nums mt-0.5">
                    30s · 1 pto
                  </div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400">Ejercicios</div>
                  <div className="text-xs sm:text-sm font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                    180s · 1 pto
                  </div>
                </div>
              </div>

              {/* Primary Start CTA */}
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame()}
                className="min-h-[46px] w-full py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-slate-950 font-extrabold text-sm sm:text-base tracking-wide shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Play className="w-5 h-5 fill-slate-950 shrink-0" />
                <span>
                  Iniciar Juego ({selectedSubject} · {selectedDifficulty})
                </span>
              </button>
            </div>
          </div>

          {/* Flat Bottom Control-Hint Line */}
          <div className="text-center text-[10px] sm:text-xs text-slate-400 font-mono tracking-wide shrink-0 pb-0.5">
            Toque o 1–4 / A–D Responder · Enter Continuar · C Pizarra · M Sonido · Esc Pausa
          </div>
        </div>
      )}

      {/* ====================================================================
          2. PLAYING VIEW (document.body.dataset.state = 'playing')
          Responsive across Mobile (390x844), Laptop (1280x800) & PC (1440x900)
         ==================================================================== */}
      {gameState === 'playing' && currentQuestion && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-2.5 sm:px-6 sm:py-4 lg:px-8 lg:py-5 pointer-events-none overflow-hidden">
          {/* TOP PERIMETER HUD */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <div className="flex items-center justify-between gap-1.5 sm:gap-4">
              {/* Top-Left Cluster: Progress, Subject, Live Points */}
              <div className="bg-[#09132e]/95 border border-amber-500/40 rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2.5 shadow-xl pointer-events-auto flex items-center gap-2 sm:gap-5 min-w-0">
                <div>
                  <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    PREG.
                  </div>
                  <div className="text-sm sm:text-2xl font-extrabold text-white font-mono tabular-nums leading-tight">
                    {currentIndex + 1}
                    <span className="text-[10px] sm:text-xs text-slate-400 font-normal">
                      /{roundQuestions.length}
                    </span>
                  </div>
                </div>

                <div className="h-6 sm:h-8 w-px bg-slate-800" />

                <div>
                  <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    PUNTOS
                  </div>
                  <div className="text-sm sm:text-2xl font-extrabold text-amber-400 font-mono tabular-nums leading-tight whitespace-nowrap">
                    {totalPointsSoFar}{' '}
                    <span className="text-[10px] sm:text-xs text-slate-300 font-normal">
                      ({projectedFinalPercentage}%)
                    </span>
                  </div>
                </div>

                <div className="hidden lg:block h-8 w-px bg-slate-800" />

                <div className="hidden lg:block">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ESCALA MILLONARIO
                  </div>
                  <div className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
                    {getMillionaireMilestoneValue(totalPointsSoFar)}
                  </div>
                </div>
              </div>

              {/* Top-Center Cluster: Dynamic 30s / 180s Timer */}
              <div className="flex flex-col items-center pointer-events-auto shrink-0">
                <div
                  className={`relative flex items-center gap-1.5 sm:gap-3 px-2.5 py-1.5 sm:px-5 sm:py-2.5 rounded-xl sm:rounded-2xl border-2 shadow-2xl transition-colors ${
                    timeLeft <= 10 && !isRevealed
                      ? 'bg-rose-950/95 border-rose-400 text-rose-200'
                      : currentQuestion.type === 'ejercicio'
                      ? 'bg-[#0b1c3d]/95 border-amber-400 text-amber-200'
                      : 'bg-[#091534]/95 border-sky-400 text-sky-200'
                  }`}
                >
                  {currentQuestion.type === 'ejercicio' ? (
                    <Calculator className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-sky-400 shrink-0" />
                  )}
                  <div>
                    <div className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider opacity-85 whitespace-nowrap">
                      {currentQuestion.type === 'ejercicio'
                        ? 'CÁLCULO (180s)'
                        : 'TEORÍA (30s)'}
                    </div>
                    <div
                      className="text-base sm:text-3xl font-extrabold font-mono tabular-nums leading-none mt-0.5"
                      data-testid="timer-readout"
                    >
                      {timeLeft}s
                    </div>
                  </div>
                </div>
                {/* Progress bar under timer (visible on tablet/laptop/desktop) */}
                <div className="hidden sm:block w-36 sm:w-44 h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1.5 border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      timeLeft <= 10
                        ? 'bg-rose-500'
                        : currentQuestion.type === 'ejercicio'
                        ? 'bg-amber-400'
                        : 'bg-sky-400'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, (timeLeft / maxTimeForCurrent) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Top-Right Cluster: Lifelines (Desktop) & Utility Controls */}
              <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
                {/* Lifelines on md+ screens */}
                <div className="hidden md:flex items-center gap-1.5 bg-[#09132e]/95 border border-slate-700/80 rounded-xl p-1.5">
                  <button
                    type="button"
                    disabled={usedFiftyFifty || isRevealed}
                    onClick={handleFiftyFifty}
                    title="Comodín 50:50 (Elimina 2 opciones incorrectas)"
                    className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-extrabold font-mono transition-colors cursor-pointer whitespace-nowrap ${
                      usedFiftyFifty
                        ? 'bg-slate-900 text-slate-600 line-through cursor-not-allowed'
                        : 'bg-amber-500/20 hover:bg-amber-500/35 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    50:50
                  </button>

                  <button
                    type="button"
                    disabled={usedAudience || isRevealed}
                    onClick={handleAudiencePoll}
                    title="Consultar a la Audiencia"
                    className={`min-h-[36px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      usedAudience
                        ? 'bg-slate-900 text-slate-600 line-through cursor-not-allowed'
                        : 'bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 border border-sky-500/40'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Público
                  </button>

                  <button
                    type="button"
                    disabled={usedHint || isRevealed}
                    onClick={handleAcademicHint}
                    title="Pista o Fórmula Académica"
                    className={`min-h-[36px] flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      usedHint
                        ? 'bg-slate-900 text-slate-600 line-through cursor-not-allowed'
                        : 'bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    Pista
                  </button>
                </div>

                {/* Scratchpad toggle on sm+ screens (on mobile it lives in Row 2) */}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setIsScratchpadOpen((prev) => !prev);
                  }}
                  aria-label="Pizarra de Cálculo"
                  title="Pizarra y Calculadora [C]"
                  className={`hidden sm:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                    isScratchpadOpen
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-[#09132e]/95 text-amber-300 border-amber-500/40 hover:bg-[#13234d]'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                </button>

                {/* Mute [M] */}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    toggleMute();
                  }}
                  aria-label={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                  title="Sonido [M]"
                  className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-xl bg-[#09132e]/95 text-slate-200 hover:text-amber-300 border border-slate-700/80 cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                {/* Pause [P] */}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    setGameState('paused');
                  }}
                  aria-label="Pausar juego"
                  title="Pausa [P / Esc]"
                  className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-xl bg-[#09132e]/95 text-slate-200 hover:text-amber-300 border border-slate-700/80 cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Lifeline & Scratchpad Bar (Visible on screens < md so mobile players have full one-thumb access) */}
            <div className="flex md:hidden items-center justify-between gap-1.5 bg-[#09132e]/95 border border-slate-800 rounded-xl px-2.5 py-1.5 pointer-events-auto">
              <span className="text-[10px] font-mono text-emerald-400 font-bold tabular-nums truncate">
                {getMillionaireMilestoneValue(totalPointsSoFar)}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={usedFiftyFifty || isRevealed}
                  onClick={handleFiftyFifty}
                  className={`min-h-[34px] px-2 py-1 rounded-lg text-[11px] font-extrabold font-mono cursor-pointer ${
                    usedFiftyFifty
                      ? 'bg-slate-900 text-slate-600 line-through'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  50:50
                </button>

                <button
                  type="button"
                  disabled={usedAudience || isRevealed}
                  onClick={handleAudiencePoll}
                  className={`min-h-[34px] flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    usedAudience
                      ? 'bg-slate-900 text-slate-600 line-through'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                  }`}
                >
                  <Users className="w-3 h-3" />
                  Público
                </button>

                <button
                  type="button"
                  disabled={usedHint || isRevealed}
                  onClick={handleAcademicHint}
                  className={`min-h-[34px] flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    usedHint
                      ? 'bg-slate-900 text-slate-600 line-through'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  <Lightbulb className="w-3 h-3" />
                  Pista
                </button>

                <button
                  type="button"
                  onClick={() => setIsScratchpadOpen((prev) => !prev)}
                  className={`sm:hidden min-h-[34px] flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                    isScratchpadOpen
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-800 text-amber-300 border-amber-500/40'
                  }`}
                >
                  <Calculator className="w-3 h-3" />
                  Calc
                </button>
              </div>
            </div>
          </div>

          {/* Active Lifeline Overlays (Audience Poll or Formula Hint) */}
          {(audiencePoll || activeHintText) && (
            <div className="mx-auto max-w-2xl w-full flex flex-col sm:flex-row gap-2 sm:gap-3 pointer-events-auto my-1 shrink-0">
              {audiencePoll && (
                <div className="flex-1 bg-[#091430]/95 border border-sky-500/40 rounded-xl p-2.5 sm:p-3 shadow-lg">
                  <div className="text-[11px] sm:text-xs font-bold text-sky-300 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Votación de la Audiencia Universitaria
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center font-mono text-xs">
                    {audiencePoll.map((pct, i) => (
                      <div key={i} className="bg-slate-900/90 rounded p-1 sm:p-1.5 border border-slate-800">
                        <div className="text-amber-400 font-bold">{['A', 'B', 'C', 'D'][i]}</div>
                        <div className="text-white font-semibold tabular-nums">{pct}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeHintText && (
                <div className="flex-1 bg-[#091430]/95 border border-emerald-500/40 rounded-xl p-2.5 sm:p-3 shadow-lg">
                  <div className="text-[11px] sm:text-xs font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Pista Académica
                  </div>
                  <p className="text-xs text-slate-200 font-mono break-words">{activeHintText}</p>
                </div>
              )}
            </div>
          )}

          {/* LOWER-THIRD MILLIONAIRE QUESTION & HEXAGONAL OPTIONS STAGE
              Scrollable on compact mobile viewports so long prompts + 4 options + explanation never clip */}
          <div className="max-w-5xl w-full mx-auto flex flex-col gap-2 sm:gap-3 pointer-events-auto overflow-y-auto max-h-full pt-1 pb-1">
            {/* Question Metadata Line (Unboxed clean text with separators) */}
            <div className="flex flex-wrap items-center justify-between gap-1 px-1 sm:px-2 text-[11px] sm:text-xs text-slate-300">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-bold text-amber-400">{currentQuestion.subject}</span>
                <span>·</span>
                <span className="text-sky-300 font-medium">{currentQuestion.topic}</span>
                <span>·</span>
                <span>{currentQuestion.difficulty}</span>
              </div>
              <div className="font-mono text-slate-400 tabular-nums">
                +1 pto · Acierto: {currentAccuracy}%
              </div>
            </div>

            {/* Hexagonal Millionaire Question Box */}
            <div className="relative bg-gradient-to-r from-[#060f29] via-[#102352] to-[#060f29] border-2 border-amber-400/80 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-8 sm:py-5 shadow-[0_12px_40px_rgba(0,0,0,0.75)]">
              <p
                className="text-sm sm:text-lg md:text-xl font-bold text-white text-center leading-snug"
                data-testid="question-prompt"
              >
                {currentQuestion.prompt}
              </p>

              {/* Optional SVG Diagram for visual Physics/Math questions */}
              <QuestionDiagramSvg diagramType={currentQuestion.diagramType} />
            </div>

            {/* 4 Hexagonal Answer Buttons (1 col on Mobile, 2x2 Grid on Tablet/Laptop/PC) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {currentQuestion.options.map((optionText, idx) => {
                const isEliminated = eliminatedOptions.includes(idx);
                const isThisSelected = selectedOption === idx;
                const isThisCorrect = idx === currentQuestion.correctIndex;

                let btnStyle =
                  'bg-[#081538]/95 hover:bg-[#132961] border-amber-500/50 text-white';

                if (isEliminated) {
                  btnStyle =
                    'bg-slate-950/60 border-slate-800/60 text-slate-600 opacity-40 cursor-not-allowed';
                } else if (isLockedIn && isThisSelected) {
                  btnStyle =
                    'bg-amber-500 text-slate-950 border-amber-200 font-bold shadow-[0_0_25px_rgba(245,158,11,0.5)]';
                } else if (isRevealed) {
                  if (isThisCorrect) {
                    btnStyle =
                      'bg-emerald-600 text-white border-emerald-300 font-bold shadow-[0_0_25px_rgba(16,185,129,0.45)]';
                  } else if (isThisSelected && !isThisCorrect) {
                    btnStyle =
                      'bg-rose-700 text-white border-rose-300 font-bold';
                  } else {
                    btnStyle = 'bg-[#071029]/80 border-slate-800 text-slate-400';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isEliminated || isLockedIn || isRevealed}
                    onClick={() => handleSelectOption(idx)}
                    data-testid={`answer-option-${idx}`}
                    className={`min-h-[48px] group relative flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5 sm:py-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${btnStyle}`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <span
                        className={`font-mono font-extrabold text-xs sm:text-sm shrink-0 inline-flex items-center gap-1.5 ${
                          isLockedIn && isThisSelected
                            ? 'text-slate-950'
                            : isRevealed && isThisCorrect
                            ? 'text-emerald-100'
                            : 'text-amber-400'
                        }`}
                      >
                        <svg
                          viewBox="0 0 12 12"
                          className="w-2.5 h-2.5 fill-current shrink-0"
                          aria-hidden="true"
                        >
                          <polygon points="6,1 11,6 6,11 1,6" />
                        </svg>
                        {['A', 'B', 'C', 'D'][idx]}:
                      </span>
                      <span className="text-xs sm:text-base font-medium leading-snug break-words">
                        {isEliminated ? '— Opción descartada (50:50) —' : optionText}
                      </span>
                    </div>

                    {isRevealed && isThisCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                    )}
                    {isRevealed && isThisSelected && !isThisCorrect && (
                      <XCircle className="w-5 h-5 text-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Answer Reveal & Explanation Bar (Non-stopping progression through all 40 questions) */}
            {isRevealed && (
              <div
                className={`mt-0.5 p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 shadow-2xl ${
                  selectedOption === currentQuestion.correctIndex
                    ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100'
                    : 'bg-rose-950/95 border-rose-500/60 text-rose-100'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
                    {selectedOption === currentQuestion.correctIndex ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300">
                          ¡Respuesta Correcta! (+1 Punto)
                        </span>
                      </>
                    ) : selectedOption === null ? (
                      <>
                        <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-rose-300">
                          ¡Tiempo Agotado! (0 Puntos · El juego continúa)
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-rose-300">
                          Respuesta Incorrecta (0 Puntos · El juego continúa hasta la 40)
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {currentQuestion.explanation}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  data-testid="next-question-btn"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer shadow-md text-center"
                >
                  {currentIndex + 1 >= roundQuestions.length
                    ? 'Ver Calificación Final (40/40) →'
                    : `Siguiente Pregunta (${currentIndex + 2}/${roundQuestions.length}) →`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          3. PAUSE MODAL (document.body.dataset.state = 'paused')
         ==================================================================== */}
      {gameState === 'paused' && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Juego en Pausa"
        >
          <div className="bg-[#0b1533] border-2 border-amber-500/50 rounded-2xl max-w-md w-full p-5 sm:p-6 text-center shadow-2xl space-y-5">
            <h2
              className="text-xl sm:text-2xl font-extrabold text-white"
              style={{ fontFamily: 'var(--font-display), sans-serif' }}
            >
              Partida en Pausa
            </h2>
            <p className="text-xs text-slate-300">
              Asignatura: <strong className="text-amber-300">{selectedSubject}</strong> · Nivel:{' '}
              <strong className="text-sky-300">{selectedDifficulty}</strong>
            </p>

            <div className="grid grid-cols-3 gap-2.5 bg-[#070e24] p-3.5 rounded-xl border border-slate-800 font-mono">
              <div>
                <div className="text-[10px] text-slate-400">PROGRESO</div>
                <div className="text-base font-bold text-white tabular-nums">
                  {currentIndex + 1}/40
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">ACIERTOS</div>
                <div className="text-base font-bold text-emerald-400 tabular-nums">
                  {totalPointsSoFar} pts
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">PROMEDIO</div>
                <div className="text-base font-bold text-amber-400 tabular-nums">
                  {projectedFinalPercentage}%
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => setGameState('playing')}
                className="min-h-[44px] w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm cursor-pointer"
              >
                Reanudar Partida
              </button>
              <button
                type="button"
                onClick={handleFinishAndEvaluateNow}
                className="min-h-[44px] w-full py-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/40 font-semibold text-xs cursor-pointer"
              >
                Finalizar y Evaluar Ronda Ahora
              </button>
              <button
                type="button"
                onClick={() => startNewGame()}
                className="min-h-[44px] w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
              >
                Reiniciar con 40 Nuevas Preguntas Aleatorias
              </button>
              <button
                type="button"
                onClick={() => setGameState('title')}
                className="min-h-[44px] w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs cursor-pointer"
              >
                Volver al Menú de Selección
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          4. GAME OVER / VICTORY / STAR STUDENT MODAL ('gameover')
         ==================================================================== */}
      {gameState === 'gameover' && frozenEvaluation && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-3 sm:p-4 pointer-events-auto overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Resultados Finales de la Partida"
        >
          <div className="bg-[#0a132e] border-2 border-amber-400/60 rounded-2xl max-w-2xl w-full p-5 sm:p-8 shadow-2xl space-y-5 my-auto">
            {/* Top Outcome Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 mb-1">
                {frozenEvaluation.isStarStudent ? (
                  <Sparkles className="w-8 h-8 sm:w-9 sm:h-9 text-amber-300" />
                ) : frozenEvaluation.won ? (
                  <Trophy className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-400" />
                ) : (
                  <RotateCcw className="w-8 h-8 sm:w-9 sm:h-9 text-rose-400" />
                )}
              </div>

              <div className="text-[11px] sm:text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
                {frozenEvaluation.badgeText}
              </div>

              <h2
                className="text-xl sm:text-3xl font-extrabold text-white"
                style={{ fontFamily: 'var(--font-display), sans-serif' }}
              >
                {frozenEvaluation.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
                {frozenEvaluation.subtitle}
              </p>
            </div>

            {/* Special Star Student Distinction Banner (> 90%) */}
            {frozenEvaluation.isStarStudent && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 border border-amber-300 flex items-center gap-3">
                <Award className="w-9 h-9 text-amber-300 shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-extrabold text-amber-200">
                    Mención Especial de Honor: Estudiante Estrella
                  </div>
                  <div className="text-xs text-amber-100/90">
                    Superaste el 90% de calificación en la ronda de 40 preguntas con excelencia académica.
                  </div>
                </div>
              </div>
            )}

            {/* Primary Score Metrics (Tabular Numerals) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
              <div className="bg-[#060d21] border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  CALIFICACIÓN FINAL
                </div>
                <div
                  className={`text-xl sm:text-3xl font-extrabold font-mono tabular-nums mt-1 ${
                    frozenEvaluation.isStarStudent
                      ? 'text-amber-300'
                      : frozenEvaluation.won
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {frozenEvaluation.percentage}%
                </div>
              </div>

              <div className="bg-[#060d21] border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  PUNTOS TOTALES
                </div>
                <div className="text-xl sm:text-3xl font-extrabold text-white font-mono tabular-nums mt-1">
                  {frozenEvaluation.totalPoints} / {frozenEvaluation.totalQuestions}
                </div>
              </div>

              <div className="bg-[#060d21] border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  TEORÍA (30s)
                </div>
                <div className="text-lg sm:text-2xl font-bold text-sky-300 font-mono tabular-nums mt-1">
                  {frozenEvaluation.byType.concepto.correct}/
                  {frozenEvaluation.byType.concepto.total}
                </div>
              </div>

              <div className="bg-[#060d21] border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  EJERCICIOS (180s)
                </div>
                <div className="text-lg sm:text-2xl font-bold text-amber-300 font-mono tabular-nums mt-1">
                  {frozenEvaluation.byType.ejercicio.correct}/
                  {frozenEvaluation.byType.ejercicio.total}
                </div>
              </div>
            </div>

            {/* Threshold Bar Indicator */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] sm:text-xs font-mono text-slate-400 tabular-nums">
                <span>0%</span>
                <span className="text-emerald-400">Ganar: 70%</span>
                <span className="text-amber-300">Estrella: &gt;90%</span>
                <span>100%</span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                <div
                  className={`h-full transition-all ${
                    frozenEvaluation.isStarStudent
                      ? 'bg-amber-400'
                      : frozenEvaluation.won
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, frozenEvaluation.percentage)}%` }}
                />
              </div>
            </div>

            {/* Answered Questions Summary List */}
            {records.length > 0 && (
              <div className="bg-[#060d21] border border-slate-800 rounded-xl p-3 max-h-36 overflow-y-auto space-y-2">
                <div className="text-xs font-bold text-slate-300">
                  Resumen de Respuestas ({records.length} respondidas)
                </div>
                {records.map((rec, idx) => {
                  const q = roundQuestions.find((item) => item.id === rec.questionId);
                  if (!q) return null;
                  return (
                    <div
                      key={`${rec.questionId}-${idx}`}
                      className="text-xs flex items-start justify-between gap-2 border-t border-slate-800/80 pt-1.5"
                    >
                      <span className="text-slate-300 truncate">
                        <strong className="font-mono text-amber-400">#{idx + 1}</strong> {q.prompt}
                      </span>
                      <span
                        className={`font-mono font-bold shrink-0 ${
                          rec.isCorrect ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {rec.isCorrect ? '+1 pto' : '0 ptos'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                data-start="true"
                onClick={() => startNewGame()}
                className="min-h-[46px] w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                Jugar Nueva Ronda (40 Preguntas)
              </button>

              <button
                type="button"
                onClick={() => setGameState('title')}
                className="min-h-[46px] w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm cursor-pointer flex items-center justify-center whitespace-nowrap"
              >
                Cambiar Asignatura / Dificultad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customizable Question Database Modal */}
      <QuestionBankModal
        isOpen={isBankOpen}
        onClose={() => setIsBankOpen(false)}
        questions={questionsDb}
        onAddQuestion={(newQ) => persistQuestions([newQ, ...questionsDb])}
        onUpdateQuestion={(updatedQ) =>
          persistQuestions(questionsDb.map((q) => (q.id === updatedQ.id ? updatedQ : q)))
        }
        onDeleteQuestion={(id) =>
          persistQuestions(questionsDb.filter((q) => q.id !== id))
        }
        onResetDefaults={() => persistQuestions(DEFAULT_QUESTIONS_DB)}
      />

      {/* 180s Exercise Calculation Scratchpad Drawer */}
      <CalculationScratchpadModal
        isOpen={isScratchpadOpen}
        onClose={() => setIsScratchpadOpen(false)}
        formulaHint={currentQuestion?.formulaOrHint}
      />
    </main>
  );
}
