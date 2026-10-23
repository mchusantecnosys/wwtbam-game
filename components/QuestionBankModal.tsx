'use client';

import React, { useState, useMemo } from 'react';
import {
  Difficulty,
  Question,
  QuestionType,
  Subject,
  SubjectSelection,
} from '@/lib/game-logic';
import {
  Plus,
  Search,
  Trash2,
  RotateCcw,
  X,
  Check,
  Edit3,
  Clock,
  BookOpen,
  Calculator,
} from 'lucide-react';

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onAddQuestion: (q: Question) => void;
  onUpdateQuestion: (q: Question) => void;
  onDeleteQuestion: (id: string) => void;
  onResetDefaults: () => void;
}

export default function QuestionBankModal({
  isOpen,
  onClose,
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onResetDefaults,
}: QuestionBankModalProps) {
  const [filterSubject, setFilterSubject] = useState<SubjectSelection>('Todos');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'Todas'>('Todas');
  const [filterType, setFilterType] = useState<QuestionType | 'Todos'>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for creating/editing a question
  const [formSubject, setFormSubject] = useState<Subject>('Matemáticas');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('Fácil');
  const [formType, setFormType] = useState<QuestionType>('concepto');
  const [formTopic, setFormTopic] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [formCorrectIndex, setFormCorrectIndex] = useState<number>(0);
  const [formExplanation, setFormExplanation] = useState('');
  const [formError, setFormError] = useState('');

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterSubject !== 'Todos' && q.subject !== filterSubject) return false;
      if (filterDifficulty !== 'Todas' && q.difficulty !== filterDifficulty) return false;
      if (filterType !== 'Todos' && q.type !== filterType) return false;
      if (searchQuery.trim()) {
        const needle = searchQuery.toLowerCase();
        return (
          q.prompt.toLowerCase().includes(needle) ||
          q.topic.toLowerCase().includes(needle) ||
          q.options.some((o) => o.toLowerCase().includes(needle))
        );
      }
      return true;
    });
  }, [questions, filterSubject, filterDifficulty, filterType, searchQuery]);

  if (!isOpen) return null;

  const openNewForm = () => {
    setEditingId(null);
    setFormSubject('Matemáticas');
    setFormDifficulty('Fácil');
    setFormType('concepto');
    setFormTopic('Tema Personalizado');
    setFormPrompt('');
    setFormOptA('');
    setFormOptB('');
    setFormOptC('');
    setFormOptD('');
    setFormCorrectIndex(0);
    setFormExplanation('');
    setFormError('');
    setIsCreating(true);
  };

  const openEditForm = (q: Question) => {
    setEditingId(q.id);
    setFormSubject(q.subject);
    setFormDifficulty(q.difficulty);
    setFormType(q.type);
    setFormTopic(q.topic);
    setFormPrompt(q.prompt);
    setFormOptA(q.options[0]);
    setFormOptB(q.options[1]);
    setFormOptC(q.options[2]);
    setFormOptD(q.options[3]);
    setFormCorrectIndex(q.correctIndex);
    setFormExplanation(q.explanation);
    setFormError('');
    setIsCreating(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formPrompt.trim() ||
      !formOptA.trim() ||
      !formOptB.trim() ||
      !formOptC.trim() ||
      !formOptD.trim()
    ) {
      setFormError('Por favor completa el enunciado y las 4 opciones de respuesta.');
      return;
    }

    const savedQuestion: Question = {
      id: editingId || `custom-${Date.now()}`,
      subject: formSubject,
      difficulty: formDifficulty,
      type: formType,
      topic: formTopic.trim() || 'General',
      prompt: formPrompt.trim(),
      options: [formOptA.trim(), formOptB.trim(), formOptC.trim(), formOptD.trim()],
      correctIndex: formCorrectIndex,
      explanation:
        formExplanation.trim() ||
        'Respuesta verificada en la base de datos personalizada.',
      isCustom: true,
    };

    if (editingId) {
      onUpdateQuestion(savedQuestion);
    } else {
      onAddQuestion(savedQuestion);
    }
    setIsCreating(false);
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Gestor de Base de Datos de Preguntas"
    >
      <div className="bg-[#0b132b] border border-amber-500/40 rounded-xl w-full max-w-5xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-800 bg-[#070d20]">
          <div className="min-w-0">
            <h2
              className="text-base sm:text-xl font-bold text-amber-400 tracking-tight truncate"
              style={{ fontFamily: 'var(--font-display), sans-serif' }}
            >
              Base de Datos de Preguntas (Bloque 1 UG)
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 tabular-nums">
              {questions.length} preguntas · Teoría (30s) · Cálculo (180s)
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            {!isCreating && (
              <button
                type="button"
                onClick={openNewForm}
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nueva Pregunta
              </button>
            )}
            <button
              type="button"
              onClick={onResetDefaults}
              className="min-h-[40px] flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Restaurar banco original del PDF"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar Banco de Preguntas"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white bg-slate-800/70 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isCreating ? (
          <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white">
                {editingId ? 'Editar Pregunta' : 'Crear Nueva Pregunta Personalizada'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Volver al listado
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-lg text-xs text-rose-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">
                  Asignatura
                </label>
                <select
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value as Subject)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="Matemáticas">Matemáticas</option>
                  <option value="Física">Física</option>
                  <option value="Lenguaje">Lenguaje</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">
                  Nivel de Dificultad
                </label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value as Difficulty)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="Fácil">Fácil</option>
                  <option value="Difícil">Difícil</option>
                  <option value="God Mode">God Mode</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">
                  Tipo y Temporizador
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as QuestionType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="concepto">Concepto / Teoría (30 s)</option>
                  <option value="ejercicio">Ejercicio de Cálculo (180 s)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1 font-medium">
                  Tema / Unidad
                </label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="Ej. Cinemática, Lógica..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Enunciado de la Pregunta
              </label>
              <textarea
                rows={3}
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="Escribe aquí el enunciado completo de la pregunta..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Opción A', val: formOptA, set: setFormOptA, idx: 0 },
                { label: 'Opción B', val: formOptB, set: setFormOptB, idx: 1 },
                { label: 'Opción C', val: formOptC, set: setFormOptC, idx: 2 },
                { label: 'Opción D', val: formOptD, set: setFormOptD, idx: 3 },
              ].map((opt) => (
                <div
                  key={opt.idx}
                  className={`p-3 rounded-lg border ${
                    formCorrectIndex === opt.idx
                      ? 'bg-emerald-950/40 border-emerald-500/60'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-200">{opt.label}</span>
                    <label className="flex items-center gap-1.5 text-xs text-emerald-400 cursor-pointer">
                      <input
                        type="radio"
                        name="correctOption"
                        checked={formCorrectIndex === opt.idx}
                        onChange={() => setFormCorrectIndex(opt.idx)}
                      />
                      Respuesta Correcta
                    </label>
                  </div>
                  <input
                    type="text"
                    value={opt.val}
                    onChange={(e) => opt.set(e.target.value)}
                    placeholder={`Texto para ${opt.label}...`}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-sm text-white"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                Explicación / Resolución Paso a Paso
              </label>
              <textarea
                rows={2}
                value={formExplanation}
                onChange={(e) => setFormExplanation(e.target.value)}
                placeholder="Explica por qué la opción seleccionada es la correcta..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Guardar Pregunta
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Filter Controls */}
            <div className="px-6 py-3 bg-[#091026] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Filtrar por asignatura"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value as SubjectSelection)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value="Todos">Asignatura: Todas</option>
                  <option value="Matemáticas">Matemáticas</option>
                  <option value="Física">Física</option>
                  <option value="Lenguaje">Lenguaje</option>
                </select>

                <select
                  aria-label="Filtrar por dificultad"
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | 'Todas')}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value="Todas">Dificultad: Todas</option>
                  <option value="Fácil">Fácil</option>
                  <option value="Difícil">Difícil</option>
                  <option value="God Mode">God Mode</option>
                </select>

                <select
                  aria-label="Filtrar por tipo de pregunta"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as QuestionType | 'Todos')}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                >
                  <option value="Todos">Tipo: Todos (30s y 180s)</option>
                  <option value="concepto">Teoría / Concepto (30s)</option>
                  <option value="ejercicio">Ejercicio de Cálculo (180s)</option>
                </select>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por tema o enunciado..."
                  aria-label="Buscar preguntas"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Question List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {filteredQuestions.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  No se encontraron preguntas con esos filtros.
                </div>
              ) : (
                filteredQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-lg bg-[#0f1938] border border-slate-800 hover:border-slate-700 transition-colors flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono text-amber-400 font-semibold tabular-nums">
                          #{index + 1}
                        </span>
                        <span>·</span>
                        <span className="text-sky-300 font-medium">{q.subject}</span>
                        <span>·</span>
                        <span className="text-amber-300 font-medium">{q.difficulty}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          {q.type === 'ejercicio' ? (
                            <Calculator className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                          )}
                          <Clock className="w-3 h-3" />
                          {q.type === 'ejercicio' ? 'Ejercicio · 180s' : 'Concepto · 30s'}
                        </span>
                        <span>·</span>
                        <span className="text-slate-400">{q.topic}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditForm(q)}
                          aria-label={`Editar pregunta ${index + 1}`}
                          className="p-1.5 text-slate-400 hover:text-amber-300 bg-slate-900/80 rounded cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteQuestion(q.id)}
                          aria-label={`Eliminar pregunta ${index + 1}`}
                          className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900/80 rounded cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm font-medium text-white leading-snug">{q.prompt}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs mt-1">
                      {q.options.map((opt, idx) => (
                        <div
                          key={idx}
                          className={`px-2.5 py-1.5 rounded border ${
                            idx === q.correctIndex
                              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200 font-medium'
                              : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="font-mono font-bold mr-1.5 text-amber-400">
                            {['A', 'B', 'C', 'D'][idx]}:
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
