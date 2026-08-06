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

/** Short filtered noise burst — a soft, physical-feeling "tock" rather than an electronic beep. */
function noiseClick(duration: number, peakGain: number, filterFreq: number) {
  const audio = getContext();
  if (!audio) return;
  const sampleCount = Math.max(1, Math.floor(audio.sampleRate * duration));
  const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) data[i] = Math.random() * 2 - 1;

  const source = audio.createBufferSource();
  source.buffer = buffer;

  // Lowpass (not bandpass) so it dulls the highs into a soft "tock" instead
  // of resonating a narrow band into an audible squeak/whistle. Low Q keeps
  // the filter from ringing at the cutoff.
  const filter = audio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.4;

  // A touch of compression to give the transient more density/punch instead
  // of just sounding louder.
  const compressor = audio.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 12;
  compressor.ratio.value = 6;
  compressor.attack.value = 0.001;
  compressor.release.value = 0.05;

  const gain = audio.createGain();
  const t0 = audio.currentTime;
  gain.gain.setValueAtTime(peakGain, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  source.connect(filter);
  filter.connect(compressor);
  compressor.connect(gain);
  gain.connect(audio.destination);
  source.start(t0);
  source.stop(t0 + duration + 0.01);
}

/** Soft, muted tap feedback for everyday UI interaction — a gentle "click", not a beep. */
export function playClick(): void {
  // +7dB and a slightly higher cutoff than the original 650Hz/0.05 gain.
  noiseClick(0.014, 0.11, 900);
}

/**
 * Wood-block-style knock: a tiny noise transient for the "hit", plus a short
 * resonant body tone that glides slightly downward as it decays — the pitch
 * drop is what reads as a physical knock instead of an electronic beep.
 * Reserved for screen transitions (menu ↔ game, new puzzle) so it stands out
 * from the plain per-tap click.
 */
export function playScreenChange(): void {
  const audio = getContext();
  if (!audio) return;
  const peakGain = 0.045;
  const frequency = 380;
  const decay = 0.05;
  const t0 = audio.currentTime;

  const noiseDur = 0.006;
  const sampleCount = Math.max(1, Math.floor(audio.sampleRate * noiseDur));
  const buffer = audio.createBuffer(1, sampleCount, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);

  const noiseSource = audio.createBufferSource();
  noiseSource.buffer = buffer;
  const noiseFilter = audio.createBiquadFilter();
  noiseFilter.type = 'lowpass';
  noiseFilter.frequency.value = 2200;
  const noiseGain = audio.createGain();
  noiseGain.gain.setValueAtTime(peakGain * 0.6, t0);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + noiseDur);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(audio.destination);
  noiseSource.start(t0);
  noiseSource.stop(t0 + noiseDur + 0.005);

  const osc = audio.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(frequency, t0);
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.82, t0 + decay);
  const toneGain = audio.createGain();
  toneGain.gain.setValueAtTime(peakGain, t0);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
  osc.connect(toneGain);
  toneGain.connect(audio.destination);
  osc.start(t0);
  osc.stop(t0 + decay + 0.01);
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
