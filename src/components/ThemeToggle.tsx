import type { Theme } from '../sudoku/types';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  /** Floats fixed over the top-right corner (used on the menu, which has no
   * competing header content there). Omit on screens with their own header
   * — e.g. GameScreen, where that corner is already the timer — and render
   * this inline as part of that header instead. */
  floating?: boolean;
}

export function ThemeToggle({ theme, onToggle, floating = false }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className={`theme-toggle${floating ? ' theme-toggle--floating' : ''}`}
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Przełącz na jasny motyw' : 'Przełącz na ciemny motyw'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
