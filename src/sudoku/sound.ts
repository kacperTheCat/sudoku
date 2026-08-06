let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!ctx) ctx = new AudioContextCtor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(frequency: number, startTime: number, duration: number, peakGain: number, type: OscillatorType) {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  const t0 = audio.currentTime + startTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Light, game-like tap feedback for any UI interaction. */
export function playClick(): void {
  tone(1100, 0, 0.035, 0.045, 'square');
}

/** Subtle rising chime for a correctly placed digit. */
export function playCorrect(): void {
  tone(660, 0, 0.09, 0.06, 'sine');
  tone(880, 0.06, 0.12, 0.055, 'sine');
}

/** Subtle but sharper buzz for an incorrectly placed digit. */
export function playIncorrect(): void {
  tone(240, 0, 0.11, 0.07, 'sawtooth');
  tone(180, 0.05, 0.13, 0.05, 'sawtooth');
}

/** Longer rising arpeggio played once the whole puzzle is solved. */
export function playSuccess(): void {
  tone(523, 0, 0.16, 0.07, 'sine');
  tone(659, 0.11, 0.16, 0.07, 'sine');
  tone(784, 0.22, 0.16, 0.07, 'sine');
  tone(1046, 0.33, 0.32, 0.08, 'sine');
}
