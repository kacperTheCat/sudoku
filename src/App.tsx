import { useEffect, useState } from 'react';
import { useGame } from './state/useGame';
import { useDailyChallenge } from './state/useDailyChallenge';
import { useInstallPrompt } from './pwa/useInstallPrompt';
import { useAppUpdate } from './pwa/useAppUpdate';
import { MenuScreen } from './components/MenuScreen';
import { GameScreen } from './components/GameScreen';
import { InstallPrompt } from './components/InstallPrompt';
import { UpdateOverlay } from './components/UpdateOverlay';
import type { Difficulty, Variant } from './sudoku/types';
import { playClick, playScreenChange } from './sudoku/sound';

type View = 'menu' | 'game';
type Mode = 'normal' | 'daily';

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

  const daily = useDailyChallenge(settings.colorAssists);

  const [view, setView] = useState<View>(() => (game ? 'game' : 'menu'));
  const [mode, setMode] = useState<Mode>('normal');
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
    setMode('normal');
    newGame(difficulty, variant);
    setView('game');
  };

  const handleStartDaily = () => {
    setMode('daily');
    setView('game');
  };

  const isDaily = mode === 'daily';
  const activeGame = isDaily ? daily.game : game;

  return (
    <div className="app">
      {view === 'menu' ? (
        <MenuScreen
          savedGame={game}
          isGenerating={isGenerating}
          theme={settings.theme}
          stats={stats}
          dailyStreak={daily.streak}
          dailyCompletedToday={daily.game?.isComplete ?? false}
          onSelectDifficulty={handleSelectDifficulty}
          onContinue={() => {
            setMode('normal');
            setView('game');
          }}
          onStartDaily={handleStartDaily}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <GameScreen
          game={activeGame}
          settings={settings}
          isGenerating={isDaily ? daily.isGenerating : isGenerating}
          pulseCells={isDaily ? daily.pulseCells : pulseCells}
          isDaily={isDaily}
          onSelect={isDaily ? daily.selectCell : selectCell}
          onDigit={isDaily ? daily.setDigit : setDigit}
          onErase={isDaily ? daily.erase : erase}
          onToggleNotes={isDaily ? daily.toggleNotesMode : toggleNotesMode}
          onUndo={isDaily ? daily.undo : undo}
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
        iOSNonSafari={installPrompt.iOSNonSafari}
        canInstall={installPrompt.canInstall}
        onInstall={installPrompt.install}
        onDismiss={installPrompt.dismiss}
      />

      <UpdateOverlay visible={updating} />
    </div>
  );
}

export default App;
