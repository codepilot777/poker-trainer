import type { Card } from './cards'

// Hand categories, higher is better.
export const HandCategory = {
  HighCard: 0,
  Pair: 1,
  TwoPair: 2,
  Trips: 3,
  Straight: 4,
  Flush: 5,
  FullHouse: 6,
  Quads: 7,
  StraightFlush: 8,
} as const
export type HandCategory = (typeof HandCategory)[keyof typeof HandCategory]

export interface HandScore {
  category: HandCategory
  tiebreak: number[] // descending significance, ranks 2-14
}

function combinations<T>(items: T[], k: number): T[][] {
  const results: T[][] = []
  const combo: T[] = []
  function backtrack(start: number) {
    if (combo.length === k) {
      results.push(combo.slice())
      return
    }
    for (let i = start; i < items.length; i++) {
      combo.push(items[i])
      backtrack(i + 1)
      combo.pop()
    }
  }
  backtrack(0)
  return results
}

function evaluate5(cards: Card[]): HandScore {
  const ranks = cards.map((c) => c.rank).sort((a, b) => b - a)
  const suits = cards.map((c) => c.suit)
  const isFlush = suits.every((s) => s === suits[0])

  const counts = new Map<number, number>()
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1)
  const byCount = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])

  // straight check (handles wheel A-2-3-4-5)
  const uniqueRanks = [...new Set(ranks)]
  let straightHigh = -1
  if (uniqueRanks.includes(14)) uniqueRanks.push(1) // ace-low
  for (let i = 0; i <= uniqueRanks.length - 5; i++) {
    let consecutive = true
    for (let j = 0; j < 4; j++) {
      if (uniqueRanks[i + j] - 1 !== uniqueRanks[i + j + 1]) {
        consecutive = false
        break
      }
    }
    if (consecutive) {
      straightHigh = uniqueRanks[i]
      break
    }
  }
  const isStraight = straightHigh !== -1

  if (isStraight && isFlush) {
    return { category: HandCategory.StraightFlush, tiebreak: [straightHigh] }
  }
  if (byCount[0][1] === 4) {
    const kicker = byCount.find(([, c]) => c === 1)![0]
    return { category: HandCategory.Quads, tiebreak: [byCount[0][0], kicker] }
  }
  if (byCount[0][1] === 3 && byCount[1][1] === 2) {
    return { category: HandCategory.FullHouse, tiebreak: [byCount[0][0], byCount[1][0]] }
  }
  if (isFlush) {
    return { category: HandCategory.Flush, tiebreak: ranks }
  }
  if (isStraight) {
    return { category: HandCategory.Straight, tiebreak: [straightHigh] }
  }
  if (byCount[0][1] === 3) {
    const kickers = byCount.filter(([, c]) => c === 1).map(([r]) => r)
    return { category: HandCategory.Trips, tiebreak: [byCount[0][0], ...kickers] }
  }
  if (byCount[0][1] === 2 && byCount[1][1] === 2) {
    const pairs = [byCount[0][0], byCount[1][0]].sort((a, b) => b - a)
    const kicker = byCount.find(([, c]) => c === 1)![0]
    return { category: HandCategory.TwoPair, tiebreak: [...pairs, kicker] }
  }
  if (byCount[0][1] === 2) {
    const kickers = byCount.filter(([, c]) => c === 1).map(([r]) => r)
    return { category: HandCategory.Pair, tiebreak: [byCount[0][0], ...kickers] }
  }
  return { category: HandCategory.HighCard, tiebreak: ranks }
}

function compareScore(a: HandScore, b: HandScore): number {
  if (a.category !== b.category) return a.category - b.category
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const av = a.tiebreak[i] ?? 0
    const bv = b.tiebreak[i] ?? 0
    if (av !== bv) return av - bv
  }
  return 0
}

/** Best 5-card score from 5, 6, or 7 cards. */
export function evaluateBest(cards: Card[]): HandScore {
  if (cards.length === 5) return evaluate5(cards)
  const combos = combinations(cards, 5)
  let best = evaluate5(combos[0])
  for (let i = 1; i < combos.length; i++) {
    const score = evaluate5(combos[i])
    if (compareScore(score, best) > 0) best = score
  }
  return best
}

export function compareHands(a: Card[], b: Card[]): number {
  return compareScore(evaluateBest(a), evaluateBest(b))
}

export const CATEGORY_NAMES: Record<HandCategory, string> = {
  [HandCategory.HighCard]: 'High Card',
  [HandCategory.Pair]: 'Pair',
  [HandCategory.TwoPair]: 'Two Pair',
  [HandCategory.Trips]: 'Three of a Kind',
  [HandCategory.Straight]: 'Straight',
  [HandCategory.Flush]: 'Flush',
  [HandCategory.FullHouse]: 'Full House',
  [HandCategory.Quads]: 'Four of a Kind',
  [HandCategory.StraightFlush]: 'Straight Flush',
}
