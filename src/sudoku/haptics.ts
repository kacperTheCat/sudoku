function vibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  // iOS Safari has never implemented the Vibration API — this is simply a
  // no-op there, sound remains the only feedback channel on iPhone.
  navigator.vibrate(pattern);
}

/** Barely-there tick for everyday UI taps — lighter than correct/incorrect/success. */
export function hapticTap(): void {
  vibrate(6);
}

export function hapticCorrect(): void {
  vibrate(15);
}

/** Between hapticCorrect and hapticSuccess in weight, for completing a box. */
export function hapticBoxComplete(): void {
  vibrate([15, 30, 25]);
}

export function hapticIncorrect(): void {
  vibrate([30, 40, 30]);
}

export function hapticSuccess(): void {
  vibrate([20, 30, 20, 30, 60]);
}
