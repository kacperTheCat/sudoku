import { DIFFICULTY_LABELS } from '../sudoku/generator';
import type { Difficulty } from '../sudoku/types';

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function pluralBledy(n: number): string {
  if (n === 1) return 'błąd';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'błędy';
  return 'błędów';
}

interface WinDialogProps {
  difficulty: Difficulty;
  seconds: number;
  moveCount: number;
  mistakeCount: number;
  isDaily?: boolean;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function WinDialog({
  difficulty,
  seconds,
  moveCount,
  mistakeCount,
  isDaily = false,
  onPlayAgain,
  onBackToMenu,
}: WinDialogProps) {
  return (
    <div className="win-overlay" role="dialog" aria-modal="true" aria-label="Wygrana">
      <div className="win-dialog">
        <h2>Rozwiązane!</h2>
        {mistakeCount === 0 && (
          <div className="win-dialog__genius-badge">
            <span className="win-dialog__genius-emoji">🧠</span>
            <span>Jesteś geniuszem!</span>
          </div>
        )}
        <p className="win-dialog__meta">
          {isDaily ? 'Wyzwanie dnia' : `Poziom: ${DIFFICULTY_LABELS[difficulty]}`} · Czas:{' '}
          {formatTime(seconds)} · Ruchy: {moveCount} · {mistakeCount} {pluralBledy(mistakeCount)}
        </p>
        {isDaily && <p className="win-dialog__meta">Wróć jutro po nowe wyzwanie!</p>}
        <div className="win-dialog__actions">
          {!isDaily && (
            <button
              type="button"
              className="button button--primary"
              onClick={onPlayAgain}
              data-sound="transition"
            >
              Kolejna łamigłówka
            </button>
          )}
          <button type="button" className="button" onClick={onBackToMenu} data-sound="transition">
            Powrót do menu
          </button>
        </div>
      </div>
    </div>
  );
}
