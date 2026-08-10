import type { CSSProperties } from 'react';
import type { RippleKind } from '../sudoku/ripple';

interface CellViewProps {
  value: number;
  notes: number[];
  isGiven: boolean;
  isSelected: boolean;
  isPeer: boolean;
  isSameValue: boolean;
  isDiagonal: boolean;
  status: 'correct' | 'incorrect' | undefined;
  isPulsing: boolean;
  rippleKind?: RippleKind;
  rippleDelayMs?: number;
  rightEdge: boolean;
  bottomEdge: boolean;
  onSelect: () => void;
}

export function CellView({
  value,
  notes,
  isGiven,
  isSelected,
  isPeer,
  isSameValue,
  isDiagonal,
  status,
  isPulsing,
  rippleKind,
  rippleDelayMs,
  rightEdge,
  bottomEdge,
  onSelect,
}: CellViewProps) {
  const digitClass = isGiven
    ? 'cell--given'
    : status === 'correct'
      ? 'cell--correct'
      : status === 'incorrect'
        ? 'cell--incorrect'
        : 'cell--entered';

  const classes = [
    'cell',
    digitClass,
    isDiagonal ? 'cell--diagonal' : '',
    isSelected ? 'cell--selected' : '',
    !isSelected && isPeer ? 'cell--peer' : '',
    !isSelected && isSameValue ? 'cell--same-value' : '',
    rightEdge ? 'cell--box-right' : '',
    bottomEdge ? 'cell--box-bottom' : '',
    rippleKind ? `cell--ripple-${rippleKind}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const style = rippleKind
    ? ({ '--ripple-delay': `${rippleDelayMs ?? 0}ms` } as CSSProperties)
    : undefined;

  return (
    <button type="button" className={classes} style={style} onClick={onSelect}>
      {value !== 0 ? (
        <span className={`cell__value${isPulsing ? ' cell__value--pulse' : ''}`}>{value}</span>
      ) : notes.length > 0 ? (
        <span className="cell__notes">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
            <span key={n} className="cell__note">
              {notes.includes(n) ? n : ''}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}
