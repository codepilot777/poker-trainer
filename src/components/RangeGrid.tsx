import { GRID_RANKS, gridCellLabel } from '../lib/handGrid'

interface RangeGridProps {
  /** Either a simple in/out range, or a per-hand class lookup for multi-category charts. */
  inRange?: Set<string>
  cellClass?: (label: string) => string
  highlight?: string | null
}

const DEFAULT_ACTIVE = 'bg-emerald-600/80 text-white'
const DEFAULT_INACTIVE = 'bg-slate-800 text-slate-500'

export function RangeGrid({ inRange, cellClass, highlight }: RangeGridProps) {
  const classFor = cellClass ?? ((label: string) => (inRange?.has(label) ? DEFAULT_ACTIVE : DEFAULT_INACTIVE))

  return (
    <div className="grid grid-cols-[repeat(13,minmax(0,1fr))] gap-0.5 select-none">
      {GRID_RANKS.map((_, row) =>
        GRID_RANKS.map((_, col) => {
          const label = gridCellLabel(row, col)
          const isHighlighted = highlight === label
          return (
            <div
              key={label}
              className={[
                'aspect-square flex items-center justify-center text-[10px] sm:text-xs rounded-sm font-medium',
                classFor(label),
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
