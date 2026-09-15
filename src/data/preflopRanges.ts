import { parseRange } from '../lib/rangeNotation'

export type Position = 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB'

export const POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB']

export const POSITION_NAMES: Record<Position, string> = {
  UTG: 'UTG (Under the Gun)',
  MP: 'MP (Middle Position)',
  CO: 'CO (Cutoff)',
  BTN: 'BTN (Button)',
  SB: 'SB (Small Blind)',
}

/**
 * Simplified 6-max first-in open-raise ranges. These are rule-of-thumb
 * approximations for training range recognition, not a solved GTO output.
 */
const RAW_RANGES: Record<Position, string> = {
  UTG: '77+,ATs+,KTs+,QTs+,JTs,T9s,98s,AJo+,KQo',
  MP: '66+,A9s+,KTs+,QTs+,J9s+,T9s,98s,87s,ATo+,KJo+,QJo',
  CO: '22+,A2s+,K8s+,Q9s+,J8s+,T8s+,97s+,86s+,76s,65s,A9o+,KTo+,QTo+,JTo',
  BTN: '22+,A2s+,K2s+,Q4s+,J6s+,T6s+,96s+,85s+,75s+,64s+,54s,A2o+,K7o+,Q9o+,J9o+,T9o',
  SB: '22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,A7o+,K9o+,QTo+,JTo',
}

export const PREFLOP_OPEN_RANGES: Record<Position, Set<string>> = Object.fromEntries(
  POSITIONS.map((pos) => [pos, parseRange(RAW_RANGES[pos])]),
) as Record<Position, Set<string>>

export function isInOpenRange(position: Position, handLabel: string): boolean {
  return PREFLOP_OPEN_RANGES[position].has(handLabel)
}
