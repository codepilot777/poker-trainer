import { POSITIONS, type Position } from './preflopRanges'
import { VS_OPEN_RANGES_BY_DEPTH } from './vsOpenRanges'
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
  position: Position,
  kind: 'threeBet' | 'call',
): Record<StackDepth, Set<string>> {
  return {
    deep: VS_OPEN_RANGES_BY_DEPTH.deep[position][kind],
    medium: VS_OPEN_RANGES_BY_DEPTH.medium[position][kind],
    short: VS_OPEN_RANGES_BY_DEPTH.short[position][kind],
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
  ...POSITIONS.flatMap((pos) => [
    {
      id: `vs-${pos.toLowerCase()}-3bet`,
      label: `vs ${pos} 3-Bet Range`,
      range: vsOpenRangeByDepth(pos, 'threeBet'),
    },
    {
      id: `vs-${pos.toLowerCase()}-call`,
      label: `vs ${pos} Call Range`,
      range: vsOpenRangeByDepth(pos, 'call'),
    },
  ]),
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
