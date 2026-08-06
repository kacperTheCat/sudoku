import { useEffect, useState } from 'react';
import { useGame } from './state/useGame';
import { MenuScreen } from './components/MenuScreen';
import { GameScreen } from './components/GameScreen';
import type { Difficulty } from './sudoku/types';
import { playClick } from './sudoku/sound';

type View = 'menu' | 'game';

function App() {
  const {
    game,
    settings,
    isGenerating,
    newGame,
    selectCell,
    setDigit,
    erase,
    toggleNotesMode,
    undo,
    toggleShowRemaining,
    toggleColorAssists,
  } = useGame();

  const [view, setView] = useState<View>(() => (game ? 'game' : 'menu'));

  // Delegated so every button in the app (board cells, menu, dialogs) gets a
  // light tap sound without wiring it into each handler. Buttons that already
  // trigger their own semantic sound (e.g. number pad digits, which play a
  // correct/incorrect/success cue) opt out via data-skip-click-sound so the
  // two don't layer.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('button');
      if (button && !button.hasAttribute('data-skip-click-sound')) playClick();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleSelectDifficulty = (difficulty: Difficulty) => {
    newGame(difficulty);
    setView('game');
  };

  return (
    <div className="app">
      {view === 'menu' ? (
        <MenuScreen
          savedGame={game}
          isGenerating={isGenerating}
          onSelectDifficulty={handleSelectDifficulty}
          onContinue={() => setView('game')}
        />
      ) : (
        <GameScreen
          game={game}
          settings={settings}
          isGenerating={isGenerating}
          onSelect={selectCell}
          onDigit={setDigit}
          onErase={erase}
          onToggleNotes={toggleNotesMode}
          onUndo={undo}
          onToggleShowRemaining={toggleShowRemaining}
          onToggleColorAssists={toggleColorAssists}
          onPlayAgain={handleSelectDifficulty}
          onBackToMenu={() => setView('menu')}
        />
      )}
    </div>
  );
}

export default App;
