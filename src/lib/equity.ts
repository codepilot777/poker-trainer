import type { Card } from './cards'
import { makeDeck, removeCards, shuffle } from './cards'
import { compareHands } from './evaluator'
import { comboOverlaps, expandRangeToCombos } from './rangeCombos'

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

/**
 * Monte Carlo equity of hero's two hole cards vs a villain range (a set of
 * canonical hand labels, e.g. from villainRanges.ts), given a partial board.
 * Each trial samples a combo uniformly from the range's expanded concrete
 * combos, which naturally weights hand types by real combo count (suited
 * hands get 4 combos, offsuit 12, pairs 6) the same way an equity
 * calculator like Equilab or PokerStove does.
 */
export function estimateEquityVsRange(
  hero: [Card, Card],
  board: Card[],
  villainRange: Set<string>,
  trials = 1500,
): EquityResult {
  const known = [...hero, ...board]
  const villainCombos = expandRangeToCombos(villainRange, known)
  if (villainCombos.length === 0) {
    // Range is fully blocked by hero's cards/board — fall back to random.
    return estimateEquityVsRandom(hero, board, trials)
  }

  const fullDeck = makeDeck()
  let win = 0
  let tie = 0
  let lose = 0

  for (let t = 0; t < trials; t++) {
    const villain = villainCombos[Math.floor(Math.random() * villainCombos.length)]
    const remaining = removeCards(fullDeck, [...known, ...villain])
    const pool = shuffle(remaining)
    const boardNeeded = 5 - board.length
    const runout = pool.slice(0, boardNeeded)
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

export interface RangeVsRangeResult {
  equityA: number
  equityB: number
  tie: number
  effectiveTrials: number
}

/**
 * Monte Carlo equity of one range against another (e.g. "BTN open range" vs
 * "BB call range") given a partial/complete board. Each trial samples a
 * combo for range A, then a compatible (non-overlapping) combo for range B,
 * both weighted by real combo count — a lightweight version of what tools
 * like Flopzilla or Equilab do for range-vs-range study.
 */
export function estimateRangeVsRangeEquity(
  rangeA: Set<string>,
  rangeB: Set<string>,
  board: Card[],
  trials = 1200,
): RangeVsRangeResult {
  const combosA = expandRangeToCombos(rangeA, board)
  const combosBAll = expandRangeToCombos(rangeB, board)
  if (combosA.length === 0 || combosBAll.length === 0) {
    return { equityA: 0.5, equityB: 0.5, tie: 0, effectiveTrials: 0 }
  }

  const fullDeck = makeDeck()
  let winA = 0
  let tie = 0
  let winB = 0
  let effectiveTrials = 0

  for (let t = 0; t < trials; t++) {
    const comboA = combosA[Math.floor(Math.random() * combosA.length)]
    const validB = combosBAll.filter((b) => !comboOverlaps(comboA, b))
    if (validB.length === 0) continue
    const comboB = validB[Math.floor(Math.random() * validB.length)]

    const remaining = removeCards(fullDeck, [...board, ...comboA, ...comboB])
    const pool = shuffle(remaining)
    const boardNeeded = 5 - board.length
    const runout = pool.slice(0, boardNeeded)
    const finalBoard = [...board, ...runout]

    const cmp = compareHands([...comboA, ...finalBoard], [...comboB, ...finalBoard])
    if (cmp > 0) winA++
    else if (cmp === 0) tie++
    else winB++
    effectiveTrials++
  }

  if (effectiveTrials === 0) return { equityA: 0.5, equityB: 0.5, tie: 0, effectiveTrials: 0 }

  return {
    equityA: (winA + tie / 2) / effectiveTrials,
    equityB: (winB + tie / 2) / effectiveTrials,
    tie: tie / effectiveTrials,
    effectiveTrials,
  }
}

export function potOdds(betToCall: number, potBeforeCall: number): number {
  // required equity to break even on a call
  return betToCall / (potBeforeCall + betToCall)
}

export function evOfCall(equity: number, potBeforeCall: number, betToCall: number): number {
  return equity * (potBeforeCall + betToCall) - (1 - equity) * betToCall
}
