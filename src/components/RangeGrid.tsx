import { GRID_RANKS, gridCellLabel } from '../lib/handGrid'

interface RangeGridProps {
  inRange: Set<string>
  highlight?: string | null
}

export function RangeGrid({ inRange, highlight }: RangeGridProps) {
  return (
    <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-0.5 select-none">
      {GRID_RANKS.map((_, row) =>
        GRID_RANKS.map((_, col) => {
          const label = gridCellLabel(row, col)
          const active = inRange.has(label)
          const isHighlighted = highlight === label
          return (
            <div
              key={label}
              className={[
                'aspect-square flex items-center justify-center text-[10px] sm:text-xs rounded-sm font-medium',
                active ? 'bg-emerald-600/80 text-white' : 'bg-slate-800 text-slate-500',
                isHighlighted ? 'ring-2 ring-yellow-400' : '',
              ].join(' ')}
            >
              {label}
            </div>
          )
        }),
      )}
    </div>
  )
}
