import type { WorldEvent } from './world';

let ctx: AudioContext | null = null;
let enabled = false;

export function setSoundEnabled(on: boolean): void {
  enabled = on;
  if (on) ensureContext();
}

function ensureContext(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function beep(freq: number, dur: number, type: OscillatorType, gain: number): void {
  if (!enabled) return;
  const c = ensureContext();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur + 0.02);
}

export function playEvent(e: WorldEvent): void {
  switch (e.type) {
    case 'jump':
      beep(520, 0.08, 'square', 0.03);
      break;
    case 'pickup':
      beep(880, 0.12, 'triangle', 0.05);
      break;
    case 'shield':
      beep(300, 0.18, 'triangle', 0.05);
      break;
    case 'hit':
      beep(120, 0.4, 'sawtooth', 0.05);
      break;
  }
}
