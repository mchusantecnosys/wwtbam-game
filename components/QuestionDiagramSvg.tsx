'use client';

import React from 'react';
import { Question } from '@/lib/game-logic';

export default function QuestionDiagramSvg({
  diagramType,
}: {
  diagramType?: Question['diagramType'];
}) {
  if (!diagramType) return null;

  return (
    <div className="my-2 flex justify-center">
      <div className="bg-[#09122c]/95 border border-amber-500/30 rounded-lg px-4 py-2.5 max-w-md w-full shadow-md">
        {diagramType === 'positive-angles' && (
          <svg viewBox="0 0 320 90" className="w-full h-20 text-slate-200">
            {[
              { id: 'a', x: 40, ccw: true, label: 'α (+)' },
              { id: 'b', x: 115, ccw: false, label: 'β (-)' },
              { id: 'c', x: 190, ccw: true, label: 'γ (+)' },
              { id: 'd', x: 265, ccw: false, label: 'θ (-)' },
            ].map((item) => (
              <g key={item.id} transform={`translate(${item.x}, 48)`}>
                <text x="-28" y="-28" fill="#fbbf24" fontSize="11" fontWeight="bold">
                  {item.id})
                </text>
                <line x1="-26" y1="0" x2="26" y2="0" stroke="#64748b" strokeWidth="1.5" />
                <line x1="0" y1="-26" x2="0" y2="26" stroke="#64748b" strokeWidth="1.5" />
                <line
                  x1="0"
                  y1="0"
                  x2={item.ccw ? -18 : 18}
                  y2={item.ccw ? -18 : 18}
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <path
                  d={
                    item.ccw
                      ? 'M 14 0 A 14 14 0 0 0 -10 -10'
                      : 'M 14 0 A 14 14 0 0 1 10 10'
                  }
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                />
                <circle
                  cx={item.ccw ? -10 : 10}
                  cy={item.ccw ? -10 : 10}
                  r="2.5"
                  fill="#f59e0b"
                />
              </g>
            ))}
          </svg>
        )}

        {diagramType === 'mrua-graphs' && (
          <svg viewBox="0 0 320 90" className="w-full h-20">
            {/* a) x-t concave down */}
            <g transform="translate(15, 12)">
              <text x="0" y="10" fill="#fbbf24" fontSize="10" fontWeight="bold">a) x vs t</text>
              <polyline points="10,15 10,65 60,65" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <path d="M 10,65 Q 20,25 55,22" fill="none" stroke="#38bdf8" strokeWidth="2" />
            </g>
            {/* b) v-t linear up */}
            <g transform="translate(90, 12)">
              <text x="0" y="10" fill="#fbbf24" fontSize="10" fontWeight="bold">b) v vs t</text>
              <polyline points="10,15 10,65 60,65" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <line x1="10" y1="65" x2="55" y2="22" stroke="#10b981" strokeWidth="2.2" />
            </g>
            {/* c) a-t decreasing */}
            <g transform="translate(165, 12)">
              <text x="0" y="10" fill="#fbbf24" fontSize="10" fontWeight="bold">c) a vs t</text>
              <polyline points="10,15 10,65 60,65" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <line x1="10" y1="25" x2="52" y2="65" stroke="#38bdf8" strokeWidth="2" />
            </g>
            {/* d) a-t constant */}
            <g transform="translate(240, 12)">
              <text x="0" y="10" fill="#fbbf24" fontSize="10" fontWeight="bold">d) a vs t</text>
              <polyline points="10,15 10,65 60,65" fill="none" stroke="#64748b" strokeWidth="1.5" />
              <line x1="10" y1="40" x2="55" y2="40" stroke="#10b981" strokeWidth="2.2" />
            </g>
          </svg>
        )}

        {diagramType === 'v-t-8s' && (
          <svg viewBox="0 0 320 95" className="w-full h-22">
            <line x1="35" y1="10" x2="35" y2="85" stroke="#94a3b8" strokeWidth="1.5" />
            <line x1="25" y1="48" x2="295" y2="48" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="12" y="18" fill="#cbd5e1" fontSize="9">v(m/s)</text>
            <text x="22" y="34" fill="#cbd5e1" fontSize="9">1</text>
            <text x="22" y="20" fill="#cbd5e1" fontSize="9">2</text>
            <text x="18" y="78" fill="#cbd5e1" fontSize="9">-2</text>
            <polyline
              points="35,34 65,34 125,18 155,48 185,76 275,76"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            <text x="62" y="59" fill="#fbbf24" fontSize="9">1</text>
            <text x="122" y="59" fill="#fbbf24" fontSize="9">3</text>
            <text x="152" y="59" fill="#fbbf24" fontSize="9">4</text>
            <text x="182" y="59" fill="#fbbf24" fontSize="9">5</text>
            <text x="272" y="59" fill="#fbbf24" fontSize="9">8 t(s)</text>
          </svg>
        )}

        {diagramType === 'pulley-ab' && (
          <svg viewBox="0 0 280 90" className="w-full h-20">
            <rect x="30" y="35" width="130" height="45" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            <rect x="85" y="14" width="34" height="21" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.5" />
            <text x="97" y="28" fill="#ffffff" fontSize="11" fontWeight="bold">A</text>
            <circle cx="168" cy="28" r="8" fill="#334155" stroke="#fbbf24" strokeWidth="2" />
            <line x1="119" y1="22" x2="168" y2="20" stroke="#fbbf24" strokeWidth="1.5" />
            <line x1="176" y1="28" x2="176" y2="48" stroke="#fbbf24" strokeWidth="1.5" />
            <rect x="163" y="48" width="26" height="20" fill="#d97706" stroke="#fde68a" strokeWidth="1.5" />
            <text x="172" y="62" fill="#ffffff" fontSize="10" fontWeight="bold">B</text>
            <line x1="176" y1="68" x2="176" y2="83" stroke="#f43f5e" strokeWidth="2" />
            <text x="183" y="82" fill="#fda4af" fontSize="10" fontWeight="bold">↓ F</text>
          </svg>
        )}

        {(diagramType === 'incline-30' || diagramType === 'incline-37') && (
          <svg viewBox="0 0 280 85" className="w-full h-20">
            <polygon points="35,75 205,75 205,15" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
            <text x="65" y="71" fill="#fbbf24" fontSize="10" fontWeight="bold">
              {diagramType === 'incline-30' ? '30°' : '37°'}
            </text>
            <text x="212" y="48" fill="#cbd5e1" fontSize="10">h = 6 m</text>
            <g transform="translate(135, 32) rotate(-19)">
              <rect x="0" y="-16" width="26" height="16" fill="#0284c7" stroke="#e0f2fe" strokeWidth="1.5" />
              <text x="8" y="-5" fill="#fff" fontSize="9" fontWeight="bold">m</text>
            </g>
          </svg>
        )}
      </div>
    </div>
  );
}
