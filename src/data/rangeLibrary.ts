import { PREFLOP_OPEN_RANGES } from './preflopRanges'
import { VS_OPEN_RANGES } from './vsOpenRanges'
import { VILLAIN_RANGES } from './villainRanges'

export interface RangeEntry {
  id: string
  label: string
  range: Set<string>
}

export const RANGE_LIBRARY: RangeEntry[] = [
  { id: 'open-utg', label: 'UTG Open', range: PREFLOP_OPEN_RANGES.UTG },
  { id: 'open-mp', label: 'MP Open', range: PREFLOP_OPEN_RANGES.MP },
  { id: 'open-co', label: 'CO Open', range: PREFLOP_OPEN_RANGES.CO },
  { id: 'open-btn', label: 'BTN Open', range: PREFLOP_OPEN_RANGES.BTN },
  { id: 'open-sb', label: 'SB Open', range: PREFLOP_OPEN_RANGES.SB },
  { id: 'vs-early-3bet', label: 'vs UTG/MP 3-Bet Range', range: VS_OPEN_RANGES.vsEarly.threeBet },
  { id: 'vs-early-call', label: 'vs UTG/MP Call Range', range: VS_OPEN_RANGES.vsEarly.call },
  { id: 'vs-co-3bet', label: 'vs CO 3-Bet Range', range: VS_OPEN_RANGES.vsCutoff.threeBet },
  { id: 'vs-co-call', label: 'vs CO Call Range', range: VS_OPEN_RANGES.vsCutoff.call },
  { id: 'vs-late-3bet', label: 'vs BTN/SB 3-Bet Range', range: VS_OPEN_RANGES.vsLate.threeBet },
  { id: 'vs-late-call', label: 'vs BTN/SB Call Range', range: VS_OPEN_RANGES.vsLate.call },
  { id: 'villain-wide', label: 'Wide Betting Range', range: VILLAIN_RANGES.wide },
  { id: 'villain-medium', label: 'Medium Betting Range', range: VILLAIN_RANGES.medium },
  { id: 'villain-tight', label: 'Tight Betting Range', range: VILLAIN_RANGES.tight },
]

export function findRange(id: string): RangeEntry {
  return RANGE_LIBRARY.find((r) => r.id === id) ?? RANGE_LIBRARY[0]
}
