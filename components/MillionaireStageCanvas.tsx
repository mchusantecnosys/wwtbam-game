'use client';

import React, { useEffect, useRef } from 'react';

export interface StageEffectTrigger {
  id: number;
  type: 'start' | 'lock' | 'correct' | 'wrong' | 'lifeline';
}

interface MillionaireStageCanvasProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  isUrgentTimer: boolean;
  isExercise: boolean;
  effectTrigger: StageEffectTrigger | null;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const MAX_PARTICLES = 80;

export default function MillionaireStageCanvas({
  gameState,
  isUrgentTimer,
  isExercise,
  effectTrigger,
}: MillionaireStageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    gameState,
    isUrgentTimer,
    isExercise,
  });

  const simRef = useRef({
    time: 0,
    hitstop: 0,
    trauma: 0,
    flashAlpha: 0,
    flashColor: '#f59e0b',
    mouseX: 0.5,
    mouseY: 0.4,
    lastEffectId: 0,
    particles: Array.from({ length: MAX_PARTICLES }, (): Particle => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 3,
      color: '#f59e0b',
    })),
    ringCursor: 0,
  });

  useEffect(() => {
    stateRef.current = { gameState, isUrgentTimer, isExercise };
  }, [gameState, isUrgentTimer, isExercise]);

  useEffect(() => {
    if (!effectTrigger || effectTrigger.id === simRef.current.lastEffectId) return;
    simRef.current.lastEffectId = effectTrigger.id;

    const canvas = canvasRef.current;
    const width = canvas ? canvas.width : 1440;
    const height = canvas ? canvas.height : 900;
    const cx = width * 0.5;
    const cy = height * 0.42;

    const spawnBurst = (count: number, colors: string[], speed: number) => {
      for (let i = 0; i < count; i++) {
        const idx = simRef.current.ringCursor % MAX_PARTICLES;
        simRef.current.ringCursor++;
        const p = simRef.current.particles[idx];
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const spd = speed * (0.45 + Math.random() * 0.85);
        p.active = true;
        p.x = cx + (Math.random() - 0.5) * 80;
        p.y = cy + (Math.random() - 0.5) * 40;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.life = 0;
        p.maxLife = 0.55 + Math.random() * 0.55;
        p.size = 2.5 + Math.random() * 4.5;
        p.color = colors[i % colors.length];
      }
    };

    if (effectTrigger.type === 'correct') {
      simRef.current.hitstop = 0.055;
      simRef.current.trauma = 0.45;
      simRef.current.flashAlpha = 0.28;
      simRef.current.flashColor = '#10b981';
      spawnBurst(26, ['#10b981', '#34d399', '#fbbf24'], 340);
    } else if (effectTrigger.type === 'wrong') {
      simRef.current.hitstop = 0.065;
      simRef.current.trauma = 0.65;
      simRef.current.flashAlpha = 0.32;
      simRef.current.flashColor = '#ef4444';
      spawnBurst(22, ['#ef4444', '#f87171', '#fb923c'], 290);
    } else if (effectTrigger.type === 'lock') {
      simRef.current.hitstop = 0.035;
      simRef.current.trauma = 0.25;
      simRef.current.flashAlpha = 0.16;
      simRef.current.flashColor = '#f59e0b';
      spawnBurst(14, ['#f59e0b', '#fbbf24', '#38bdf8'], 210);
    } else if (effectTrigger.type === 'start' || effectTrigger.type === 'lifeline') {
      simRef.current.trauma = 0.3;
      simRef.current.flashAlpha = 0.2;
      simRef.current.flashColor = '#38bdf8';
      spawnBurst(20, ['#38bdf8', '#fbbf24', '#818cf8'], 260);
    }
  }, [effectTrigger]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId = 0;
    let lastTime = performance.now();

    const updateSize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(320, Math.floor(rect.width));
      canvas.height = Math.max(320, Math.floor(rect.height));
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(canvas);

    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        simRef.current.mouseX = (e.clientX - rect.left) / rect.width;
        simRef.current.mouseY = (e.clientY - rect.top) / rect.height;
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    const render = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const { gameState: curState, isUrgentTimer: urgent, isExercise: exercise } = stateRef.current;
      const sim = simRef.current;

      // Decay trauma & flash even during hitstop
      sim.trauma = Math.max(0, sim.trauma - dt * 1.8);
      sim.flashAlpha = Math.max(0, sim.flashAlpha - dt * 1.4);

      if (sim.hitstop > 0) {
        sim.hitstop = Math.max(0, sim.hitstop - dt);
      } else if (curState !== 'paused') {
        const speedMul = curState === 'title' ? 0.85 : urgent ? 1.85 : 1.0;
        sim.time += dt * speedMul;

        // Update pooled particles in-place
        for (let i = 0; i < MAX_PARTICLES; i++) {
          const p = sim.particles[i];
          if (!p.active) continue;
          p.life += dt;
          if (p.life >= p.maxLife) {
            p.active = false;
            continue;
          }
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 120 * dt; // subtle gravity
          p.vx *= 0.98;
        }
      }

      const w = canvas.width;
      const h = canvas.height;

      ctx.save();

      // Decaying trauma^2 camera shake
      if (sim.trauma > 0.001) {
        const shake = sim.trauma * sim.trauma * 14;
        const dx = (Math.sin(now * 0.07) * 0.7 + (Math.random() - 0.5) * 0.6) * shake;
        const dy = (Math.cos(now * 0.09) * 0.7 + (Math.random() - 0.5) * 0.6) * shake;
        ctx.translate(dx, dy);
      }

      // 1. Deep TV Studio radial background
      const bgGrad = ctx.createRadialGradient(
        w * 0.5,
        h * 0.36,
        20,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.85
      );
      if (urgent) {
        bgGrad.addColorStop(0, '#230b1b');
        bgGrad.addColorStop(0.55, '#0c0d24');
        bgGrad.addColorStop(1, '#040611');
      } else if (exercise) {
        bgGrad.addColorStop(0, '#0c1f38');
        bgGrad.addColorStop(0.55, '#081126');
        bgGrad.addColorStop(1, '#040711');
      } else {
        bgGrad.addColorStop(0, '#101b3b');
        bgGrad.addColorStop(0.55, '#080e24');
        bgGrad.addColorStop(1, '#040611');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // 2. Volumetric sweeping studio spotlights
      const beamCount = 4;
      for (let i = 0; i < beamCount; i++) {
        const baseX = (w / (beamCount + 1)) * (i + 1);
        const sway =
          Math.sin(sim.time * (0.55 + i * 0.14) + i * 1.7) * (w * 0.14) +
          (sim.mouseX - 0.5) * 90;
        const targetX = baseX + sway;

        const beamGrad = ctx.createLinearGradient(baseX, 0, targetX, h * 0.92);
        const beamHue = urgent
          ? 'rgba(244, 63, 94, 0.08)'
          : i % 2 === 0
          ? 'rgba(56, 189, 248, 0.075)'
          : 'rgba(245, 158, 11, 0.065)';
        beamGrad.addColorStop(0, beamHue);
        beamGrad.addColorStop(1, 'rgba(6, 9, 22, 0)');

        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(baseX - 18, 0);
        ctx.lineTo(baseX + 18, 0);
        ctx.lineTo(targetX + 190, h * 0.95);
        ctx.lineTo(targetX - 190, h * 0.95);
        ctx.closePath();
        ctx.fill();
      }

      // 3. Concentric Millionaire Studio Arena Rings & Hexagonal Grid
      const centerX = w * 0.5 + (sim.mouseX - 0.5) * -28;
      const centerY =
        curState === 'title'
          ? h * 0.42 + (sim.mouseY - 0.5) * -18
          : h * 0.29 + (sim.mouseY - 0.5) * -14;
      const baseRadius = Math.min(w, h) * (curState === 'title' ? 0.3 : 0.22);

      for (let r = 1; r <= 3; r++) {
        const radius = baseRadius * (0.55 + r * 0.34);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(sim.time * (r % 2 === 0 ? 0.12 : -0.15) + r);
        ctx.strokeStyle = urgent
          ? `rgba(251, 113, 133, ${0.18 - r * 0.04})`
          : `rgba(245, 158, 11, ${0.18 - r * 0.04})`;
        ctx.lineWidth = r === 1 ? 2 : 1.2;
        ctx.setLineDash(r === 2 ? [12, 8] : [24, 14]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 4. Draw pooled particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = sim.particles[i];
        if (!p.active) continue;
        const alpha = Math.max(0, 1 - p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 5. Hit flash overlay
      if (sim.flashAlpha > 0.005) {
        ctx.fillStyle = sim.flashColor;
        ctx.globalAlpha = sim.flashAlpha;
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1;
      }

      // 6. Urgent low-timer peripheral vignette
      if (urgent && curState === 'playing') {
        const pulse = 0.14 + Math.sin(sim.time * 8) * 0.06;
        const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.25, w * 0.5, h * 0.5, w * 0.75);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, `rgba(225, 29, 72, ${pulse})`);
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.restore();
      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('pointermove', onPointerMove);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      data-testid="millionaire-stage-container"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        aria-label="Escenario interactivo de estudio de televisión"
      />
    </div>
  );
}
