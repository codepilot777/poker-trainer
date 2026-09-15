import { RANKS } from './cards'
import type { Card } from './cards'

const RANK_VALUE: Record<string, number> = {}
RANKS.forEach((r, i) => (RANK_VALUE[r] = i + 2)) // '2' -> 2 ... 'A' -> 14

interface ParsedHand {
  hi: number
  lo: number
  suited: boolean | null // null = pair
}

function parseHandLabel(label: string): ParsedHand {
  const r1 = RANK_VALUE[label[0]]
  const r2 = RANK_VALUE[label[1]]
  const suitedFlag = label[2] // 's' | 'o' | undefined for pairs
  if (r1 === r2) return { hi: r1, lo: r2, suited: null }
  return { hi: Math.max(r1, r2), lo: Math.min(r1, r2), suited: suitedFlag === 's' }
}

function cardKey(c: Card): string {
  return `${c.rank}-${c.suit}`
}

/**
 * Expands a set of canonical hand labels (e.g. "AKs", "77") into concrete
 * two-card combos, excluding any combo that uses a dead (already-known)
 * card. Enumerating actual combos (6 per pair, 4 per suited hand, 12 per
 * offsuit hand) naturally preserves each hand type's real-world combo
 * weighting when a combo is later sampled uniformly from the result.
 */
export function expandRangeToCombos(range: Set<string>, deadCards: Card[]): [Card, Card][] {
  const dead = new Set(deadCards.map(cardKey))
  const combos: [Card, Card][] = []

  for (const label of range) {
    const { hi, lo, suited } = parseHandLabel(label)
    if (suited === null) {
      // pair: all C(4,2) = 6 suit combinations
      for (let s1 = 0; s1 < 4; s1++) {
        for (let s2 = s1 + 1; s2 < 4; s2++) {
          const a: Card = { rank: hi, suit: s1 }
          const b: Card = { rank: lo, suit: s2 }
          if (!dead.has(cardKey(a)) && !dead.has(cardKey(b))) combos.push([a, b])
        }
      }
    } else if (suited) {
      for (let s = 0; s < 4; s++) {
        const a: Card = { rank: hi, suit: s }
        const b: Card = { rank: lo, suit: s }
        if (!dead.has(cardKey(a)) && !dead.has(cardKey(b))) combos.push([a, b])
      }
    } else {
      for (let s1 = 0; s1 < 4; s1++) {
        for (let s2 = 0; s2 < 4; s2++) {
          if (s1 === s2) continue
          const a: Card = { rank: hi, suit: s1 }
          const b: Card = { rank: lo, suit: s2 }
          if (!dead.has(cardKey(a)) && !dead.has(cardKey(b))) combos.push([a, b])
        }
      }
    }
  }

  return combos
}

/** True if two combos share a card (can't both be dealt in the same hand). */
export function comboOverlaps(a: [Card, Card], b: [Card, Card]): boolean {
  return (
    cardKey(a[0]) === cardKey(b[0]) ||
    cardKey(a[0]) === cardKey(b[1]) ||
    cardKey(a[1]) === cardKey(b[0]) ||
    cardKey(a[1]) === cardKey(b[1])
  )
}
