import { POSITIONS, type Position } from './preflopRanges'
import { VS_OPEN_RANGES_BY_DEPTH, type VsOpenTier } from './vsOpenRanges'
import { VILLAIN_RANGES } from './villainRanges'
import { STACK_DEPTH_RANGES, type StackDepth } from './stackDepthRanges'

export interface RangeEntry {
  id: string
  label: string
  /**
   * Either a single depth-independent range (e.g. a bet-size-based villain
   * range) or one range per effective stack depth (e.g. an open/response
   * range, which changes shape as stacks get shallower).
   */
  range: Set<string> | Record<StackDepth, Set<string>>
}

/** Resolves a library entry to a concrete range set for the given depth. */
export function rangeAtDepth(entry: RangeEntry, depth: StackDepth): Set<string> {
  return entry.range instanceof Set ? entry.range : entry.range[depth]
}

function openRangeByDepth(position: Position): Record<StackDepth, Set<string>> {
  return {
    deep: STACK_DEPTH_RANGES.deep[position],
    medium: STACK_DEPTH_RANGES.medium[position],
    short: STACK_DEPTH_RANGES.short[position],
  }
}

function vsOpenRangeByDepth(
  tier: VsOpenTier,
  kind: 'threeBet' | 'call',
): Record<StackDepth, Set<string>> {
  return {
    deep: VS_OPEN_RANGES_BY_DEPTH.deep[tier][kind],
    medium: VS_OPEN_RANGES_BY_DEPTH.medium[tier][kind],
    short: VS_OPEN_RANGES_BY_DEPTH.short[tier][kind],
  }
}

const OPEN_LABELS: Record<Position, string> = {
  UTG: 'UTG Open',
  MP: 'MP Open',
  CO: 'CO Open',
  BTN: 'BTN Open',
  SB: 'SB Open',
}

export const RANGE_LIBRARY: RangeEntry[] = [
  ...POSITIONS.map((pos) => ({
    id: `open-${pos.toLowerCase()}`,
    label: OPEN_LABELS[pos],
    range: openRangeByDepth(pos),
  })),
  { id: 'vs-early-3bet', label: 'vs UTG/MP 3-Bet Range', range: vsOpenRangeByDepth('vsEarly', 'threeBet') },
  { id: 'vs-early-call', label: 'vs UTG/MP Call Range', range: vsOpenRangeByDepth('vsEarly', 'call') },
  { id: 'vs-co-3bet', label: 'vs CO 3-Bet Range', range: vsOpenRangeByDepth('vsCutoff', 'threeBet') },
  { id: 'vs-co-call', label: 'vs CO Call Range', range: vsOpenRangeByDepth('vsCutoff', 'call') },
  { id: 'vs-late-3bet', label: 'vs BTN/SB 3-Bet Range', range: vsOpenRangeByDepth('vsLate', 'threeBet') },
  { id: 'vs-late-call', label: 'vs BTN/SB Call Range', range: vsOpenRangeByDepth('vsLate', 'call') },
  { id: 'villain-wide', label: 'Wide Betting Range', range: VILLAIN_RANGES.wide },
  { id: 'villain-medium', label: 'Medium Betting Range', range: VILLAIN_RANGES.medium },
  { id: 'villain-tight', label: 'Tight Betting Range', range: VILLAIN_RANGES.tight },
]

export function findRange(id: string): RangeEntry {
  return RANGE_LIBRARY.find((r) => r.id === id) ?? RANGE_LIBRARY[0]
}

/** Whether this entry's range actually changes with stack depth. */
export function isDepthDependent(entry: RangeEntry): boolean {
  return !(entry.range instanceof Set)
}
