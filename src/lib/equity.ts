import type { Card } from './cards'
import { makeDeck, removeCards, shuffle } from './cards'
import { compareHands } from './evaluator'

export interface EquityResult {
  win: number
  tie: number
  lose: number
  equity: number // win + tie/2, 0..1
}

/**
 * Monte Carlo equity of hero's two hole cards vs a random (uniform) villain
 * hand, given a partial board (0, 3, or 4 known cards). Good enough for
 * training pot-odds/EV decisions; not a precise range-vs-range solver.
 */
export function estimateEquityVsRandom(
  hero: [Card, Card],
  board: Card[],
  trials = 1500,
): EquityResult {
  const fullDeck = makeDeck()
  const known = [...hero, ...board]
  const remaining = removeCards(fullDeck, known)

  let win = 0
  let tie = 0
  let lose = 0

  for (let t = 0; t < trials; t++) {
    const pool = shuffle(remaining)
    const villain: [Card, Card] = [pool[0], pool[1]]
    const boardNeeded = 5 - board.length
    const runout = pool.slice(2, 2 + boardNeeded)
    const finalBoard = [...board, ...runout]

    const cmp = compareHands([...hero, ...finalBoard], [...villain, ...finalBoard])
    if (cmp > 0) win++
    else if (cmp === 0) tie++
    else lose++
  }

  return {
    win: win / trials,
    tie: tie / trials,
    lose: lose / trials,
    equity: (win + tie / 2) / trials,
  }
}

export function potOdds(betToCall: number, potBeforeCall: number): number {
  // required equity to break even on a call
  return betToCall / (potBeforeCall + betToCall)
}

export function evOfCall(equity: number, potBeforeCall: number, betToCall: number): number {
  return equity * (potBeforeCall + betToCall) - (1 - equity) * betToCall
}
