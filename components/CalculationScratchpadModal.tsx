'use client';

import React, { useState } from 'react';
import { X, Calculator, Eraser } from 'lucide-react';

interface CalculationScratchpadModalProps {
  isOpen: boolean;
  onClose: () => void;
  formulaHint?: string;
}

export default function CalculationScratchpadModal({
  isOpen,
  onClose,
  formulaHint,
}: CalculationScratchpadModalProps) {
  const [notes, setNotes] = useState('');
  const [expr, setExpr] = useState('');
  const [calcResult, setCalcResult] = useState<string>('0');

  if (!isOpen) return null;

  const evaluateQuickExpression = (input: string) => {
    setExpr(input);
    if (!input.trim()) {
      setCalcResult('0');
      return;
    }
    try {
      const sanitized = input
        .replace(/,/g, '.')
        .replace(/sqrt\(/gi, 'Math.sqrt(')
        .replace(/sin\(/gi, 'Math.sin((Math.PI/180)*')
        .replace(/cos\(/gi, 'Math.cos((Math.PI/180)*')
        .replace(/tan\(/gi, 'Math.tan((Math.PI/180)*')
        .replace(/\^/g, '**');

      if (/^[0-9+\-*/().,\sA-Za-z*]+$/.test(sanitized)) {
        const fn = new Function(`return (${sanitized})`);
        const val = fn();
        if (typeof val === 'number' && Number.isFinite(val)) {
          setCalcResult(Number(val.toFixed(4)).toString());
        }
      }
    } catch {
      // ignore partial expression while typing
    }
  };

  return (
    <div
      className="fixed inset-x-3 bottom-3 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 z-40 w-auto sm:w-96 bg-[#09122a] border-2 border-amber-500/50 rounded-2xl shadow-2xl p-4 pointer-events-auto max-h-[80dvh] overflow-y-auto"
      role="dialog"
      aria-label="Pizarra de Cálculo Matemático"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-amber-400 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-amber-300 tracking-wide">
            Pizarra y Calculadora Rápida (180s)
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar Pizarra de Cálculo"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-400 hover:text-white bg-slate-800/70 rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {formulaHint && (
        <div className="mb-3 p-2.5 bg-sky-950/60 border border-sky-500/30 rounded-lg text-xs text-sky-200 font-mono break-words">
          Fórmula / Dato: {formulaHint}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs text-slate-400 mb-1">
          Expresión rápida (ej: 60 / (10 - 7.5) o 29 / tan(35))
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={expr}
            onChange={(e) => evaluateQuickExpression(e.target.value)}
            placeholder="Escribe operación..."
            aria-label="Expresión matemática"
            className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono text-white"
          />
          <div className="px-3 py-2 bg-amber-500/15 border border-amber-500/40 rounded-lg text-xs sm:text-sm font-mono font-bold text-amber-300 tabular-nums min-w-[76px] text-right shrink-0">
            = {calcResult}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-slate-400">Apuntes de resolución</label>
          <button
            type="button"
            onClick={() => {
              setNotes('');
              setExpr('');
              setCalcResult('0');
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white py-1 px-2 rounded cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
            Limpiar
          </button>
        </div>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anota tus despejes, datos o pasos intermedios aquí..."
          aria-label="Apuntes de resolución"
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs sm:text-sm font-mono text-slate-200"
        />
      </div>
    </div>
  );
}
