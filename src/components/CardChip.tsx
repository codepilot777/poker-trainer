import type { Card } from '../lib/cards'
import { cardLabel } from '../lib/cards'

function suitColor(suit: number): string {
  // 0=s,1=h,2=d,3=c
  if (suit === 0) return 'text-slate-100'
  if (suit === 1) return 'text-rose-400'
  if (suit === 2) return 'text-sky-400'
  return 'text-emerald-400'
}

export function CardChip({ card, small }: { card: Card; small?: boolean }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-md bg-slate-900 border border-slate-700 font-bold',
        small ? 'w-9 h-12 text-sm' : 'w-12 h-16 text-lg',
        suitColor(card.suit),
      ].join(' ')}
    >
      {cardLabel(card).toUpperCase()}
    </span>
  )
}
