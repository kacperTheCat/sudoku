import { DIFFICULTY_LABELS } from '../sudoku/generator';
import type { Difficulty } from '../sudoku/types';

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface WinDialogProps {
  difficulty: Difficulty;
  seconds: number;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export function WinDialog({ difficulty, seconds, onPlayAgain, onBackToMenu }: WinDialogProps) {
  return (
    <div className="win-overlay" role="dialog" aria-modal="true" aria-label="Wygrana">
      <div className="win-dialog">
        <h2>Rozwiązane!</h2>
        <p className="win-dialog__meta">
          Poziom: {DIFFICULTY_LABELS[difficulty]} · Czas: {formatTime(seconds)}
        </p>
        <div className="win-dialog__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={onPlayAgain}
            data-sound="transition"
          >
            Kolejna łamigłówka
          </button>
          <button type="button" className="button" onClick={onBackToMenu} data-sound="transition">
            Powrót do menu
          </button>
        </div>
      </div>
    </div>
  );
}
