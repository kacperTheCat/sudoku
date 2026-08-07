import { useEffect, useState } from 'react';
import { useGame } from './state/useGame';
import { useInstallPrompt } from './pwa/useInstallPrompt';
import { useAppUpdate } from './pwa/useAppUpdate';
import { MenuScreen } from './components/MenuScreen';
import { GameScreen } from './components/GameScreen';
import { InstallPrompt } from './components/InstallPrompt';
import { UpdateOverlay } from './components/UpdateOverlay';
import type { Difficulty, Variant } from './sudoku/types';
import { playClick, playScreenChange } from './sudoku/sound';

type View = 'menu' | 'game';

function App() {
  const {
    game,
    settings,
    stats,
    isGenerating,
    pulseCells,
    newGame,
    selectCell,
    setDigit,
    erase,
    toggleNotesMode,
    undo,
    toggleShowRemaining,
    toggleColorAssists,
    toggleTheme,
  } = useGame();

  const [view, setView] = useState<View>(() => (game ? 'game' : 'menu'));
  const installPrompt = useInstallPrompt();
  const { updating } = useAppUpdate();

  // Delegated so every button in the app (board cells, menu, dialogs) gets a
  // light tap sound without wiring it into each handler. Buttons that already
  // trigger their own semantic sound (e.g. number pad digits, which play a
  // correct/incorrect/success cue) opt out via data-skip-click-sound so the
  // two don't layer. Buttons that change screens (menu ↔ game, new puzzle)
  // are marked data-sound="transition" to get the wood-knock cue instead.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('button');
      if (!button || button.hasAttribute('data-skip-click-sound')) return;
      if (button.getAttribute('data-sound') === 'transition') playScreenChange();
      else playClick();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleSelectDifficulty = (difficulty: Difficulty, variant: Variant = 'classic') => {
    newGame(difficulty, variant);
    setView('game');
  };

  return (
    <div className="app">
      {view === 'menu' ? (
        <MenuScreen
          savedGame={game}
          isGenerating={isGenerating}
          theme={settings.theme}
          stats={stats}
          onSelectDifficulty={handleSelectDifficulty}
          onContinue={() => setView('game')}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <GameScreen
          game={game}
          settings={settings}
          isGenerating={isGenerating}
          pulseCells={pulseCells}
          onSelect={selectCell}
          onDigit={setDigit}
          onErase={erase}
          onToggleNotes={toggleNotesMode}
          onUndo={undo}
          onToggleShowRemaining={toggleShowRemaining}
          onToggleColorAssists={toggleColorAssists}
          onToggleTheme={toggleTheme}
          onPlayAgain={handleSelectDifficulty}
          onBackToMenu={() => setView('menu')}
        />
      )}

      <InstallPrompt
        visible={installPrompt.visible}
        iOS={installPrompt.iOS}
        canInstall={installPrompt.canInstall}
        onInstall={installPrompt.install}
        onDismiss={installPrompt.dismiss}
      />

      <UpdateOverlay visible={updating} />
    </div>
  );
}

export default App;
