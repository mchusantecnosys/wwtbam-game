'use client';

class MillionaireSoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainVal: number = 0.12,
    delay: number = 0,
    pitchSlideTo?: number
  ) {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (pitchSlideTo) {
      osc.frequency.exponentialRampToValueAtTime(pitchSlideTo, now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  /** Dramatic "Let's Play Millionaire" start sting */
  public playGameStart() {
    if (this.isMuted) return;
    // Deep dramatic studio chord + ascending arpeggio
    const notes = [146.83, 220.0, 293.66, 349.23, 440.0, 587.33];
    notes.forEach((n, idx) => {
      this.playTone(n, 0.7 - idx * 0.05, 'triangle', 0.1, idx * 0.07);
    });
    this.playTone(73.42, 1.1, 'sawtooth', 0.08, 0);
  }

  /** Question reveal subtle studio chime */
  public playQuestionReveal(isExercise: boolean) {
    if (this.isMuted) return;
    if (isExercise) {
      // Deeper analytical chime for 180s calculation question
      this.playTone(261.63, 0.25, 'triangle', 0.09, 0);
      this.playTone(329.63, 0.3, 'triangle', 0.09, 0.08);
      this.playTone(392.0, 0.45, 'sine', 0.1, 0.16);
    } else {
      // Crisp 30s concept chime
      this.playTone(329.63, 0.2, 'sine', 0.08, 0);
      this.playTone(493.88, 0.35, 'triangle', 0.09, 0.07);
    }
  }

  /** "¿Respuesta definitiva?" lock-in suspense chord */
  public playLockIn() {
    if (this.isMuted) return;
    const jitter = 0.96 + Math.random() * 0.08;
    this.playTone(196.0 * jitter, 0.4, 'sawtooth', 0.07, 0);
    this.playTone(293.66 * jitter, 0.42, 'triangle', 0.11, 0.03);
    this.playTone(466.16 * jitter, 0.45, 'sine', 0.09, 0.06);
  }

  /** Correct answer fanfare (+1 point) */
  public playCorrect() {
    if (this.isMuted) return;
    const chord = [293.66, 369.99, 440.0, 587.33]; // D major bright
    chord.forEach((freq, i) => {
      this.playTone(freq, 0.45, 'triangle', 0.11, i * 0.055);
    });
    this.playTone(880.0, 0.5, 'sine', 0.08, 0.22);
  }

  /** Incorrect or timed-out dramatic low brass sting */
  public playWrong() {
    if (this.isMuted) return;
    this.playTone(185.0, 0.45, 'sawtooth', 0.09, 0, 130.81);
    this.playTone(174.61, 0.5, 'triangle', 0.11, 0.08, 123.47);
  }

  /** Timer tick-tock — higher urgency when <= 10s */
  public playTick(urgent: boolean = false) {
    if (this.isMuted) return;
    if (urgent) {
      this.playTone(880, 0.06, 'square', 0.05, 0);
      this.playTone(660, 0.05, 'sine', 0.04, 0.08);
    } else {
      this.playTone(520, 0.04, 'sine', 0.03, 0);
    }
  }

  /** Lifeline activation sound */
  public playLifeline() {
    if (this.isMuted) return;
    this.playTone(300, 0.28, 'sine', 0.1, 0, 780);
    this.playTone(450, 0.32, 'triangle', 0.08, 0.08, 920);
  }

  /** End-of-game fanfare based on tier */
  public playGameEnd(tier: 'PERDIO' | 'GANO' | 'ESTUDIANTE_ESTRELLA') {
    if (this.isMuted) return;
    if (tier === 'ESTUDIANTE_ESTRELLA') {
      const fanfare = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5];
      fanfare.forEach((f, i) => {
        this.playTone(f, 0.55, 'triangle', 0.12, i * 0.08);
      });
    } else if (tier === 'GANO') {
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((f, i) => {
        this.playTone(f, 0.45, 'triangle', 0.11, i * 0.09);
      });
    } else {
      const notes = [293.66, 277.18, 261.63, 246.94];
      notes.forEach((f, i) => {
        this.playTone(f, 0.38, 'sawtooth', 0.08, i * 0.14);
      });
    }
  }
}

export const soundEngine = new MillionaireSoundEngine();
