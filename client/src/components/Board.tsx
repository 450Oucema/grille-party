import type { GridCell } from '../types'

type Props = {
  grid: GridCell[][]
}

export default function Board({ grid }: Props) {
  const size = grid.length
  // Scale cell size: 6x6 needs smaller cells than 4x4
  const cellClass = size <= 4
    ? 'cell-tile w-20 h-20 text-4xl'
    : size === 5
    ? 'cell-tile w-16 h-16 text-3xl'
    : 'cell-tile w-14 h-14 text-2xl'

  return (
    <div className="flex flex-col gap-1.5">
      {grid.map((row, r) => (
        <div key={r} className="flex gap-1.5">
          {row.map((cell, c) => (
            <div key={c} className={cellClass}>
              {cell.letter === 'QU' ? <span className="text-[0.7em]">Qu</span> : cell.letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
