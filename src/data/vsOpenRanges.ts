import { parseRange } from '../lib/rangeNotation'
import type { Position } from './preflopRanges'

export type VsOpenTier = 'vsEarly' | 'vsCutoff' | 'vsLate'

/**
 * Simplified single-raised-pot response ranges: what to do facing an
 * open-raise, grouped by how tight/wide the opener's range likely is.
 * Rule-of-thumb approximations for training the fold/call/3-bet decision,
 * not a solved GTO output — real responses also depend on hero's own
 * position and stack depth, which this simplifies away.
 */
const RAW_TIERS: Record<VsOpenTier, { threeBet: string; call: string }> = {
  vsEarly: {
    threeBet: 'QQ+,AKs,AKo',
    call: '99-JJ,ATs-AQs,KQs,AQo',
  },
  vsCutoff: {
    threeBet: 'JJ+,AQs+,AKo,A5s',
    call: '77-TT,A9s-AJs,KTs+,QJs,JTs,T9s,98s,87s,AJo,KQo',
  },
  vsLate: {
    threeBet: 'TT+,AJs+,KQs,AQo+,A5s,A4s',
    call: '22-99,A2s-ATs,K9s+,Q9s+,J9s+,T8s+,97s+,86s+,75s+,64s+,53s+,ATo+,KJo+,QJo',
  },
}

export const VS_OPEN_RANGES: Record<VsOpenTier, { threeBet: Set<string>; call: Set<string> }> =
  Object.fromEntries(
    Object.entries(RAW_TIERS).map(([tier, { threeBet, call }]) => [
      tier,
      { threeBet: parseRange(threeBet), call: parseRange(call) },
    ]),
  ) as Record<VsOpenTier, { threeBet: Set<string>; call: Set<string> }>

export function tierForOpenerPosition(position: Position): VsOpenTier {
  if (position === 'UTG' || position === 'MP') return 'vsEarly'
  if (position === 'CO') return 'vsCutoff'
  return 'vsLate' // BTN, SB
}

export type Vs3BetAction = 'fold' | 'call' | 'threeBet'

export function correctVsOpenAction(tier: VsOpenTier, handLabel: string): Vs3BetAction {
  const { threeBet, call } = VS_OPEN_RANGES[tier]
  if (threeBet.has(handLabel)) return 'threeBet'
  if (call.has(handLabel)) return 'call'
  return 'fold'
}
