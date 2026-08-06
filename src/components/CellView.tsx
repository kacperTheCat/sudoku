interface CellViewProps {
  value: number;
  notes: number[];
  isGiven: boolean;
  isSelected: boolean;
  isPeer: boolean;
  isSameValue: boolean;
  status: 'correct' | 'incorrect' | undefined;
  isPulsing: boolean;
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
  status,
  isPulsing,
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
    isSelected ? 'cell--selected' : '',
    !isSelected && isPeer ? 'cell--peer' : '',
    !isSelected && isSameValue ? 'cell--same-value' : '',
    rightEdge ? 'cell--box-right' : '',
    bottomEdge ? 'cell--box-bottom' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} onClick={onSelect}>
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
