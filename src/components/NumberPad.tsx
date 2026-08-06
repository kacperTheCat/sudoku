interface NumberPadProps {
  remaining: number[];
  showRemaining: boolean;
  colorAssists: boolean;
  notesMode: boolean;
  canUndo: boolean;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onToggleNotes: () => void;
  onUndo: () => void;
  onToggleShowRemaining: () => void;
  onToggleColorAssists: () => void;
}

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function NumberPad({
  remaining,
  showRemaining,
  colorAssists,
  notesMode,
  canUndo,
  onDigit,
  onErase,
  onToggleNotes,
  onUndo,
  onToggleShowRemaining,
  onToggleColorAssists,
}: NumberPadProps) {
  return (
    <div className="number-pad">
      <div className="number-pad__digits">
        {DIGITS.map((digit) => {
          const left = remaining[digit - 1];
          return (
            <button
              key={digit}
              type="button"
              className="number-pad__digit"
              disabled={left <= 0}
              onClick={() => onDigit(digit)}
              {...(colorAssists ? { 'data-skip-click-sound': true } : {})}
            >
              {digit}
              {showRemaining && left > 0 && <span className="number-pad__badge">{left}</span>}
            </button>
          );
        })}
      </div>
      <div className="number-pad__tools">
        <button type="button" className="number-pad__tool" onClick={onUndo} disabled={!canUndo}>
          Cofnij
        </button>
        <button type="button" className="number-pad__tool" onClick={onErase}>
          Wyczyść
        </button>
        <button
          type="button"
          className={`number-pad__tool${notesMode ? ' number-pad__tool--active' : ''}`}
          onClick={onToggleNotes}
        >
          Notatki
        </button>
        <button
          type="button"
          className={`number-pad__tool${showRemaining ? ' number-pad__tool--active' : ''}`}
          onClick={onToggleShowRemaining}
        >
          Liczniki
        </button>
        <button
          type="button"
          className={`number-pad__tool${colorAssists ? ' number-pad__tool--active' : ''}`}
          onClick={onToggleColorAssists}
        >
          Kolory
        </button>
      </div>
    </div>
  );
}
