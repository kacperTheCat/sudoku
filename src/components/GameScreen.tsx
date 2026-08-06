import { useMemo } from 'react';
import type { Difficulty, GameState, Settings } from '../sudoku/types';
import { DIFFICULTY_LABELS } from '../sudoku/generator';
import { Board } from './Board';
import { NumberPad } from './NumberPad';
import { Timer } from './Timer';
import { ThemeToggle } from './ThemeToggle';
import { WinDialog } from './WinDialog';

interface GameScreenProps {
  game: GameState | null;
  settings: Settings;
  isGenerating: boolean;
  pulseCells: number[];
  onSelect: (index: number) => void;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onToggleNotes: () => void;
  onUndo: () => void;
  onToggleShowRemaining: () => void;
  onToggleColorAssists: () => void;
  onToggleTheme: () => void;
  onPlayAgain: (difficulty: Difficulty) => void;
  onBackToMenu: () => void;
}

export function GameScreen({
  game,
  settings,
  isGenerating,
  pulseCells,
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
        <span className="game-screen__difficulty">{DIFFICULTY_LABELS[game.difficulty]}</span>
        <div className="game-screen__header-end">
          <Timer seconds={game.elapsedSeconds} />
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
          onPlayAgain={() => onPlayAgain(game.difficulty)}
          onBackToMenu={onBackToMenu}
        />
      )}
    </div>
  );
}
