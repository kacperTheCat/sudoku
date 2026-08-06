import { DIFFICULTY_CLUES, DIFFICULTY_LABELS } from '../sudoku/generator';
import type { Difficulty, GameState } from '../sudoku/types';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface MenuScreenProps {
  savedGame: GameState | null;
  isGenerating: boolean;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onContinue: () => void;
}

export function MenuScreen({
  savedGame,
  isGenerating,
  onSelectDifficulty,
  onContinue,
}: MenuScreenProps) {
  const canContinue = !!savedGame && !savedGame.isComplete;

  return (
    <div className="screen menu-screen">
      <h1 className="menu-screen__title">Sudoku</h1>

      {canContinue && (
        <button
          type="button"
          className="button button--primary menu-screen__continue"
          onClick={onContinue}
        >
          <span>Kontynuuj grę</span>
          <span className="menu-screen__continue-meta">
            {DIFFICULTY_LABELS[savedGame!.difficulty]} · {formatTime(savedGame!.elapsedSeconds)}
          </span>
        </button>
      )}

      <p className="menu-screen__prompt">Nowa gra</p>
      <div className="menu-screen__difficulties">
        {DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty}
            type="button"
            className="button difficulty-button"
            disabled={isGenerating}
            onClick={() => onSelectDifficulty(difficulty)}
          >
            <span className="difficulty-button__label">{DIFFICULTY_LABELS[difficulty]}</span>
            <span className="difficulty-button__clues">
              {DIFFICULTY_CLUES[difficulty]} liczb na start
            </span>
          </button>
        ))}
      </div>

      {isGenerating && <p className="menu-screen__generating">Generowanie planszy…</p>}
    </div>
  );
}
