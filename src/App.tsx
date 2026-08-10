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
import { hapticTap } from './sudoku/haptics';
import { loadGame } from './state/storage';

type View = 'menu' | 'game';
type Mode = 'normal' | 'daily';

function App() {
  const [view, setView] = useState<View>(() => (loadGame() ? 'game' : 'menu'));
  const [mode, setMode] = useState<Mode>('normal');

  const {
    game,
    settings,
    stats,
    isGenerating,
    pulseCells,
    rippleCells,
    newGame,
    selectCell,
    setDigit,
    erase,
    toggleNotesMode,
    undo,
    clearIncorrectDigits,
    toggleShowRemaining,
    toggleColorAssists,
    toggleTheme,
  } = useGame(view === 'game' && mode === 'normal');

  const daily = useDailyChallenge(settings.colorAssists, view === 'game' && mode === 'daily');

  const installPrompt = useInstallPrompt();
  const { updating } = useAppUpdate();

  // Delegated so every button in the app (board cells, menu, dialogs) gets a
  // light tap sound + haptic without wiring it into each handler. Buttons
  // that already trigger their own semantic sound (e.g. number pad digits,
  // which play a correct/incorrect/success cue) opt out via
  // data-skip-click-sound so the two don't layer. Buttons that change
  // screens (menu ↔ game, new puzzle) are marked data-sound="transition" to
  // get the wood-knock cue instead. The tap haptic is deliberately much
  // lighter than the correct/incorrect/success ones so it reads as ambient
  // touch feedback, not a result cue.
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest('button');
      if (!button || button.hasAttribute('data-skip-click-sound')) return;
      if (button.getAttribute('data-sound') === 'transition') playScreenChange();
      else playClick();
      hapticTap();
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

  // Podpowiedzi is a single global setting shared by both save slots, so
  // switching it on sweeps wrong digits out of whichever slot(s) have them —
  // not just the one currently being played — so neither shows stale
  // "incorrect but uncolored" leftovers next time it's opened.
  const handleToggleColorAssists = () => {
    const turningOn = !settings.colorAssists;
    toggleColorAssists();
    if (turningOn) {
      clearIncorrectDigits();
      daily.clearIncorrectDigits();
    }
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
          rippleCells={isDaily ? daily.rippleCells : rippleCells}
          isDaily={isDaily}
          onSelect={isDaily ? daily.selectCell : selectCell}
          onDigit={isDaily ? daily.setDigit : setDigit}
          onErase={isDaily ? daily.erase : erase}
          onToggleNotes={isDaily ? daily.toggleNotesMode : toggleNotesMode}
          onUndo={isDaily ? daily.undo : undo}
          onToggleShowRemaining={toggleShowRemaining}
          onToggleColorAssists={handleToggleColorAssists}
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
