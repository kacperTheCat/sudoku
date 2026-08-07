import { boxOf, colOf, rowOf, isOnMainDiagonal, isOnAntiDiagonal } from '../sudoku/solver';
import type { Variant } from '../sudoku/types';
import { CellView } from './CellView';

type CellStatus = 'correct' | 'incorrect' | undefined;

interface BoardProps {
  values: number[];
  givens: number[];
  notes: number[][];
  selected: number | null;
  cellStatus: CellStatus[];
  pulseCells: number[];
  variant: Variant;
  onSelect: (index: number) => void;
}

export function Board({
  values,
  givens,
  notes,
  selected,
  cellStatus,
  pulseCells,
  variant,
  onSelect,
}: BoardProps) {
  const selectedRow = selected !== null ? rowOf(selected) : -1;
  const selectedCol = selected !== null ? colOf(selected) : -1;
  const selectedBox = selected !== null ? boxOf(selected) : -1;
  const selectedValue = selected !== null ? values[selected] : 0;
  const selectedOnMain = selected !== null && variant === 'x' && isOnMainDiagonal(selected);
  const selectedOnAnti = selected !== null && variant === 'x' && isOnAntiDiagonal(selected);

  return (
    <div className="board" role="grid" aria-label="Plansza sudoku">
      {values.map((value, index) => {
        const isSelected = index === selected;
        const onDiagonal = variant === 'x' && (isOnMainDiagonal(index) || isOnAntiDiagonal(index));
        const isDiagonalPeer =
          (selectedOnMain && isOnMainDiagonal(index)) || (selectedOnAnti && isOnAntiDiagonal(index));
        const isPeer =
          selected !== null &&
          !isSelected &&
          (rowOf(index) === selectedRow ||
            colOf(index) === selectedCol ||
            boxOf(index) === selectedBox ||
            isDiagonalPeer);
        const isSameValue = !isSelected && selectedValue !== 0 && value === selectedValue;

        return (
          <CellView
            key={index}
            value={value}
            notes={notes[index]}
            isGiven={givens[index] !== 0}
            isSelected={isSelected}
            isPeer={isPeer}
            isSameValue={isSameValue}
            isDiagonal={onDiagonal}
            status={cellStatus[index]}
            isPulsing={pulseCells.includes(index)}
            rightEdge={colOf(index) === 2 || colOf(index) === 5}
            bottomEdge={rowOf(index) === 2 || rowOf(index) === 5}
            onSelect={() => onSelect(index)}
          />
        );
      })}
    </div>
  );
}
