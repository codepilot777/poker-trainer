import { parseRange } from '../lib/rangeNotation'
import { PREFLOP_OPEN_RANGES, POSITIONS, type Position } from './preflopRanges'

export type StackDepth = 'deep' | 'medium' | 'short'

export const STACK_DEPTHS: StackDepth[] = ['deep', 'medium', 'short']

export const STACK_DEPTH_LABELS: Record<StackDepth, string> = {
  deep: '100bb (deep)',
  medium: '40bb (medium)',
  short: '20bb (short — push/fold)',
}

/** What the "open" action is actually called at this depth. */
export const STACK_DEPTH_ACTION_LABEL: Record<StackDepth, string> = {
  deep: 'Raise',
  medium: 'Raise',
  short: 'Shove',
}

/**
 * 40bb ranges tighten from the 100bb open ranges by cutting the most
 * speculative hands (small suited connectors, weak suited aces, offsuit
 * broadways with weak kickers) — implied odds shrink as effective stacks
 * shrink, so those hands lose most of their value.
 */
const RAW_MEDIUM: Record<Position, string> = {
  UTG: '88+,AJs+,KQs,AQo+',
  MP: '77+,ATs+,KQs,AJo+,KQo',
  CO: '55+,A8s+,KTs+,QTs+,JTs,T9s,98s,ATo+,KJo+',
  BTN: '33+,A5s+,K8s+,Q9s+,J9s+,T9s,98s,87s,A8o+,KTo+,QTo+,JTo',
  SB: '44+,A7s+,K9s+,QTs+,JTs,T9s,98s,A9o+,KTo+,QJo',
}

/**
 * 20bb shove ranges: a computed chip-EV Nash equilibrium, not another
 * hand-authored heuristic. Method: classical fictitious play with
 * Cesàro-averaged beliefs (needed because naive iterative best-response
 * oscillates instead of converging for this kind of game) — for each
 * position, the shove range and every later position's calling range are
 * jointly solved via Monte Carlo simulation of the app's own hand
 * evaluator (150 trials/hand, 24 iterations), until the averaged
 * strategies stabilize. Each of the five "first-in" shove decisions is an
 * independent subgame (only one position can be first to act in a given
 * hand), so UTG/MP/CO/BTN/SB were solved separately, each against all
 * positions behind it (including BB, which never opens itself).
 *
 * Assumptions/simplifications: flat 20bb effective stack for every seat,
 * no ante, blinds abstracted to a flat 1.5bb dead-money pot (not tracking
 * exactly who posted what), pure chip EV (no ICM). Because this is a true
 * mutual best-response rather than a "shove wide, real opponents fold too
 * much" exploitative chart, it comes out noticeably tighter than typical
 * published practical push/fold charts — that's expected, not a bug: a
 * Nash-consistent opponent calls off enough that the shover can't profit
 * from combos that only work if villain folds too often.
 */
const RAW_SHORT: Record<Position, string> = {
  UTG: '66+,A8s+,KJs+,QTs,ATo+',
  MP: '66+,A5s,A8s+,KTs,KQs,ATo+,KQo',
  CO: '55+,A3s-A2s,A5s,A7s+,KJs+,A9o+,KJo+',
  BTN: '33,55+,A2s+,K9s+,QJs,A5o+,KTo+',
  SB: '22+,A2s+,K3s+,Q8s+,J9s+,T8s+,A2o+,K6o,K8o,KTo+,Q9o+,J9o',
}

function buildRanges(raw: Record<Position, string>): Record<Position, Set<string>> {
  return Object.fromEntries(
    POSITIONS.map((pos) => [pos, parseRange(raw[pos])]),
  ) as Record<Position, Set<string>>
}

export const STACK_DEPTH_RANGES: Record<StackDepth, Record<Position, Set<string>>> = {
  deep: PREFLOP_OPEN_RANGES,
  medium: buildRanges(RAW_MEDIUM),
  short: buildRanges(RAW_SHORT),
}

export function isInDepthRange(depth: StackDepth, position: Position, handLabel: string): boolean {
  return STACK_DEPTH_RANGES[depth][position].has(handLabel)
}
