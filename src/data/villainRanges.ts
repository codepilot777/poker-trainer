import { parseRange } from '../lib/rangeNotation'

/**
 * Approximate villain betting ranges, used to make postflop equity
 * estimates more realistic than "vs a uniformly random hand". Bigger bets
 * are modeled as coming from a stronger, more polarized range; smaller
 * bets from a wider one. Still a simplification — a real opponent's range
 * depends on the whole hand history, not just bet size — but far closer to
 * reality than assuming they could have literally any two cards.
 */
const RAW_VILLAIN_RANGES = {
  wide: '22+,A2s+,K2s+,Q2s+,J4s+,T5s+,95s+,85s+,74s+,64s+,53s+,43s,A2o+,K5o+,Q8o+,J8o+,T8o+,98o',
  medium: '22+,A2s+,K7s+,Q9s+,J9s+,T8s+,97s+,87s,76s,65s,A8o+,KTo+,QTo+,JTo',
  tight: '66+,A9s+,KTs+,QTs+,JTs,T9s,98s,AJo+,KQo',
} as const

export type VillainRangeTier = keyof typeof RAW_VILLAIN_RANGES

export const VILLAIN_RANGES: Record<VillainRangeTier, Set<string>> = {
  wide: parseRange(RAW_VILLAIN_RANGES.wide),
  medium: parseRange(RAW_VILLAIN_RANGES.medium),
  tight: parseRange(RAW_VILLAIN_RANGES.tight),
}

/** Picks a villain range tier from the bet size relative to the pot. */
export function villainRangeForBet(bet: number, pot: number): VillainRangeTier {
  const fraction = bet / pot
  if (fraction < 0.5) return 'wide'
  if (fraction < 0.85) return 'medium'
  return 'tight'
}

/**
 * Villain betting ranges for a 3-bet pot: villain already had to continue
 * facing a preflop 3-bet to get here, so even the "wide" tier is much
 * tighter than the single-raised-pot equivalent.
 */
const RAW_VILLAIN_RANGES_3BET = {
  wide: '55+,A8s+,KTs+,QTs+,JTs,T9s,98s,AJo+,KQo',
  medium: '77+,ATs+,KJs+,QJs,AQo+',
  tight: 'TT+,AQs+,AKo',
} as const

export const VILLAIN_RANGES_3BET: Record<VillainRangeTier, Set<string>> = {
  wide: parseRange(RAW_VILLAIN_RANGES_3BET.wide),
  medium: parseRange(RAW_VILLAIN_RANGES_3BET.medium),
  tight: parseRange(RAW_VILLAIN_RANGES_3BET.tight),
}
