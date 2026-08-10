import { useMemo } from 'react';
import type { Difficulty, GameState, Settings, Variant } from '../sudoku/types';
import type { RippleCell } from '../sudoku/ripple';
import { DIFFICULTY_LABELS } from '../sudoku/generator';
import { Board } from './Board';
import { NumberPad } from './NumberPad';
import { Timer } from './Timer';
import { ThemeToggle } from './ThemeToggle';
import { WinDialog } from './WinDialog';

function pluralRuchy(n: number): string {
  if (n === 1) return 'ruch';
  const lastDigit = n % 10;
  const lastTwo = n % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return 'ruchy';
  return 'ruchów';
}

interface GameScreenProps {
  game: GameState | null;
  settings: Settings;
  isGenerating: boolean;
  pulseCells: number[];
  rippleCells: RippleCell[];
  isDaily?: boolean;
  onSelect: (index: number) => void;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onToggleNotes: () => void;
  onUndo: () => void;
  onToggleShowRemaining: () => void;
  onToggleColorAssists: () => void;
  onToggleTheme: () => void;
  onPlayAgain: (difficulty: Difficulty, variant: Variant) => void;
  onBackToMenu: () => void;
}

export function GameScreen({
  game,
  settings,
  isGenerating,
  pulseCells,
  rippleCells,
  isDaily = false,
  onSelect,
  onDigit,
  onErase,
  onToggleNotes,
  onUndo,
  onToggleShowRemaining,
  onToggleColorAssists,
  onToggleTheme,
  onPlayAgain,
  onBackToMenu,
}: GameScreenProps) {
  const cellStatus = useMemo(() => {
    if (!game || !settings.colorAssists) return [];
    return game.values.map((value, i) => {
      if (value === 0 || game.givens[i] !== 0) return undefined;
      return value === game.solution[i] ? ('correct' as const) : ('incorrect' as const);
    });
  }, [game, settings.colorAssists]);

  const remaining = useMemo(() => {
    const counts = new Array(9).fill(9);
    if (game) {
      for (const v of game.values) {
        if (v !== 0) counts[v - 1]--;
      }
    }
    return counts;
  }, [game]);

  if (!game || isGenerating) {
    return (
      <div className="screen screen--loading">
        <p>Generowanie planszy…</p>
      </div>
    );
  }

  return (
    <div className="screen game-screen">
      <header className="game-screen__header">
        <button
          type="button"
          className="button button--ghost"
          onClick={onBackToMenu}
          data-sound="transition"
        >
          ← Menu
        </button>
        <span className="game-screen__difficulty">
          {isDaily ? 'Wyzwanie dnia' : DIFFICULTY_LABELS[game.difficulty]}
          {game.variant === 'x' ? ' · X' : ''}
        </span>
        <div className="game-screen__header-end">
          <span className="game-screen__stats">
            <Timer seconds={game.elapsedSeconds} />
            <span className="move-counter">
              {game.moveCount} {pluralRuchy(game.moveCount)}
            </span>
          </span>
          <ThemeToggle theme={settings.theme} onToggle={onToggleTheme} />
        </div>
      </header>

      <div className="game-screen__body">
        <Board
          values={game.values}
          givens={game.givens}
          notes={game.notes}
          selected={game.selected}
          cellStatus={cellStatus}
          pulseCells={pulseCells}
          rippleCells={rippleCells}
          variant={game.variant}
          onSelect={onSelect}
        />

        <NumberPad
          remaining={remaining}
          showRemaining={settings.showRemaining}
          colorAssists={settings.colorAssists}
          notesMode={game.notesMode}
          canUndo={game.history.length > 0}
          onDigit={onDigit}
          onErase={onErase}
          onToggleNotes={onToggleNotes}
          onUndo={onUndo}
          onToggleShowRemaining={onToggleShowRemaining}
          onToggleColorAssists={onToggleColorAssists}
        />
      </div>

      {game.isComplete && (
        <WinDialog
          difficulty={game.difficulty}
          seconds={game.elapsedSeconds}
          moveCount={game.moveCount}
          isDaily={isDaily}
          onPlayAgain={() => onPlayAgain(game.difficulty, game.variant)}
          onBackToMenu={onBackToMenu}
        />
      )}
    </div>
  );
}
