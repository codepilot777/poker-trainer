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
 * 20bb shove ranges widen instead — postflop play barely exists at this
 * depth, so a shove's fold equity plus decent all-in equity when called
 * makes many hands profitable that wouldn't be a normal open, especially
 * from later positions with fewer players left to act behind.
 */
const RAW_SHORT: Record<Position, string> = {
  UTG: '66+,A8s+,KTs+,QTs+,JTs,ATo+,KQo',
  MP: '55+,A6s+,K9s+,QTs+,JTs,T9s,A9o+,KJo+',
  CO: '33+,A2s+,K6s+,Q8s+,J8s+,T8s+,98s,87s,A7o+,K9o+,QTo+,JTo',
  BTN: '22+,A2s+,K2s+,Q4s+,J6s+,T6s+,96s+,85s+,75s+,64s+,54s,A2o+,K5o+,Q8o+,J8o+,T8o+,98o',
  SB: '22+,A2s+,K2s+,Q2s+,J4s+,T6s+,96s+,86s+,75s+,64s+,53s+,A2o+,K4o+,Q8o+,J8o+,T8o+,98o',
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
