import { boxOf, colOf, rowOf } from '../sudoku/solver';
import { CellView } from './CellView';

type CellStatus = 'correct' | 'incorrect' | undefined;

interface BoardProps {
  values: number[];
  givens: number[];
  notes: number[][];
  selected: number | null;
  cellStatus: CellStatus[];
  pulseCells: number[];
  onSelect: (index: number) => void;
}

export function Board({ values, givens, notes, selected, cellStatus, pulseCells, onSelect }: BoardProps) {
  const selectedRow = selected !== null ? rowOf(selected) : -1;
  const selectedCol = selected !== null ? colOf(selected) : -1;
  const selectedBox = selected !== null ? boxOf(selected) : -1;
  const selectedValue = selected !== null ? values[selected] : 0;

  return (
    <div className="board" role="grid" aria-label="Plansza sudoku">
      {values.map((value, index) => {
        const isSelected = index === selected;
        const isPeer =
          selected !== null &&
          !isSelected &&
          (rowOf(index) === selectedRow || colOf(index) === selectedCol || boxOf(index) === selectedBox);
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
