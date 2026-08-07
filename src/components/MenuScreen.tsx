import { useState } from 'react';
import { DIFFICULTY_CLUES, DIFFICULTY_LABELS } from '../sudoku/generator';
import type { Difficulty, GameState, Stats, Theme, Variant } from '../sudoku/types';
import type { DailyStreak } from '../state/storage';
import { ThemeToggle } from './ThemeToggle';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];

// Sudoku X is implemented and working, just hidden from the menu for now —
// flip this back on to re-expose the Klasyczny/Sudoku X picker.
const SHOW_EXPERIMENTAL_VARIANT = false;

const VARIANTS: Variant[] = ['classic', 'x'];

const VARIANT_LABELS: Record<Variant, string> = {
  classic: 'Klasyczny',
  x: 'Sudoku X',
};

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatAverage(stat: { gamesCompleted: number; totalSeconds: number }): string {
  if (stat.gamesCompleted === 0) return '—';
  return formatTime(Math.round(stat.totalSeconds / stat.gamesCompleted));
}

function formatBest(stat: { bestSeconds: number | null }): string {
  if (stat.bestSeconds === null) return '—';
  return formatTime(stat.bestSeconds);
}

function pluralRuchy(n: number): string {
  if (n === 1) return 'ruch';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'ruchy';
  return 'ruchów';
}

function formatAverageMoves(stat: { gamesCompleted: number; totalMoves: number }): string {
  if (stat.gamesCompleted === 0) return '—';
  const avg = Math.round(stat.totalMoves / stat.gamesCompleted);
  return `${avg} ${pluralRuchy(avg)}`;
}

function pluralDni(n: number): string {
  return n === 1 ? 'dzień' : 'dni';
}

interface MenuScreenProps {
  savedGame: GameState | null;
  isGenerating: boolean;
  theme: Theme;
  stats: Stats;
  dailyStreak: DailyStreak;
  dailyCompletedToday: boolean;
  onSelectDifficulty: (difficulty: Difficulty, variant: Variant) => void;
  onContinue: () => void;
  onStartDaily: () => void;
  onToggleTheme: () => void;
}

export function MenuScreen({
  savedGame,
  isGenerating,
  theme,
  stats,
  dailyStreak,
  dailyCompletedToday,
  onSelectDifficulty,
  onContinue,
  onStartDaily,
  onToggleTheme,
}: MenuScreenProps) {
  const [variant, setVariant] = useState<Variant>('classic');
  const canContinue = !!savedGame && !savedGame.isComplete;

  return (
    <div className="screen menu-screen">
      <ThemeToggle theme={theme} onToggle={onToggleTheme} floating />

      <h1 className="menu-screen__title">Sudoku</h1>

      <button
        type="button"
        className="button button--primary menu-screen__daily"
        onClick={onStartDaily}
        data-sound="transition"
      >
        <span>Wyzwanie dnia{dailyCompletedToday ? ' ✓' : ''}</span>
        <span className="menu-screen__daily-meta">
          {dailyStreak.currentStreak > 0
            ? `🔥 ${dailyStreak.currentStreak} ${pluralDni(dailyStreak.currentStreak)} z rzędu`
            : 'Zagraj, żeby zacząć passę'}
        </span>
      </button>

      {canContinue && (
        <button
          type="button"
          className="button button--primary menu-screen__continue"
          onClick={onContinue}
          data-sound="transition"
        >
          <span>Kontynuuj grę</span>
          <span className="menu-screen__continue-meta">
            {DIFFICULTY_LABELS[savedGame!.difficulty]}
            {savedGame!.variant === 'x' ? ' · Sudoku X' : ''} · {formatTime(savedGame!.elapsedSeconds)}
          </span>
        </button>
      )}

      {SHOW_EXPERIMENTAL_VARIANT && (
        <>
          <p className="menu-screen__prompt">Tryb (eksperymentalny)</p>
          <div className="variant-toggle">
            {VARIANTS.map((v) => (
              <button
                key={v}
                type="button"
                className={`variant-toggle__option${variant === v ? ' variant-toggle__option--active' : ''}`}
                onClick={() => setVariant(v)}
              >
                {VARIANT_LABELS[v]}
              </button>
            ))}
          </div>
          {variant === 'x' && (
            <p className="menu-screen__variant-hint">
              Dodatkowa zasada: obie główne przekątne też muszą zawierać unikalne cyfry 1-9.
            </p>
          )}
        </>
      )}

      <p className="menu-screen__prompt">Nowa gra</p>
      <div className="menu-screen__difficulties">
        {DIFFICULTIES.map((difficulty) => (
          <button
            key={difficulty}
            type="button"
            className="button difficulty-button"
            disabled={isGenerating}
            onClick={() => onSelectDifficulty(difficulty, variant)}
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
            <span className="stats-grid__value">
              śr. {formatAverage(stats[difficulty])} · rekord {formatBest(stats[difficulty])}
            </span>
            <span className="stats-grid__value">śr. {formatAverageMoves(stats[difficulty])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
