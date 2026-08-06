import { DIFFICULTY_CLUES, DIFFICULTY_LABELS } from '../sudoku/generator';
import type { Difficulty, GameState, Stats, Theme } from '../sudoku/types';
import { ThemeToggle } from './ThemeToggle';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatAverage(stat: { gamesCompleted: number; totalSeconds: number }): string {
  if (stat.gamesCompleted === 0) return '—';
  return formatTime(Math.round(stat.totalSeconds / stat.gamesCompleted));
}

interface MenuScreenProps {
  savedGame: GameState | null;
  isGenerating: boolean;
  theme: Theme;
  stats: Stats;
  onSelectDifficulty: (difficulty: Difficulty) => void;
  onContinue: () => void;
  onToggleTheme: () => void;
}

export function MenuScreen({
  savedGame,
  isGenerating,
  theme,
  stats,
  onSelectDifficulty,
  onContinue,
  onToggleTheme,
}: MenuScreenProps) {
  const canContinue = !!savedGame && !savedGame.isComplete;

  return (
    <div className="screen menu-screen">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} floating />

      <h1 className="menu-screen__title">Sudoku</h1>

      {canContinue && (
        <button
          type="button"
          className="button button--primary menu-screen__continue"
          onClick={onContinue}
          data-sound="transition"
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
            data-sound="transition"
          >
            <span className="difficulty-button__label">{DIFFICULTY_LABELS[difficulty]}</span>
            <span className="difficulty-button__clues">
              {DIFFICULTY_CLUES[difficulty]} liczb na start
            </span>
          </button>
        ))}
      </div>

      {isGenerating && <p className="menu-screen__generating">Generowanie planszy…</p>}

      <p className="menu-screen__prompt">Statystyki</p>
      <div className="stats-grid">
        {DIFFICULTIES.map((difficulty) => (
          <div key={difficulty} className="stats-grid__item">
            <span className="stats-grid__label">{DIFFICULTY_LABELS[difficulty]}</span>
            <span className="stats-grid__value">{stats[difficulty].gamesCompleted} gier</span>
            <span className="stats-grid__value">śr. {formatAverage(stats[difficulty])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
