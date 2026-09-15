import { parseRange } from '../lib/rangeNotation'
import type { Position } from './preflopRanges'

export type VsOpenTier = 'vsEarly' | 'vsCutoff' | 'vsLate'
export type ResponseDepth = 'deep' | 'medium' | 'short'

export const RESPONSE_DEPTHS: ResponseDepth[] = ['deep', 'medium', 'short']

export const RESPONSE_DEPTH_LABELS: Record<ResponseDepth, string> = {
  deep: '100bb (deep)',
  medium: '40bb (medium)',
  short: '20bb (short — shove/fold)',
}

/** What the "aggressive" response is actually called at this depth. */
export const RESPONSE_AGGRO_LABEL: Record<ResponseDepth, string> = {
  deep: '3-Bet',
  medium: '3-Bet',
  short: 'Shove',
}

interface TierRanges {
  threeBet: string
  call: string
}

/**
 * Simplified single-raised-pot response ranges: what to do facing an
 * open-raise, grouped by how tight/wide the opener's range likely is, and
 * by effective stack depth. Rule-of-thumb approximations for training the
 * fold/call/3-bet(shove) decision, not a solved GTO output — real
 * responses also depend on hero's exact position, which this simplifies
 * away by only distinguishing the opener's position tier.
 */
const RAW_TIERS_DEEP: Record<VsOpenTier, TierRanges> = {
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

/**
 * 40bb: the call range tightens (speculative small suited/offsuit hands
 * lose value as implied odds shrink), 3-bet ranges tighten slightly too.
 */
const RAW_TIERS_MEDIUM: Record<VsOpenTier, TierRanges> = {
  vsEarly: {
    threeBet: 'QQ+,AKs,AKo',
    call: 'TT-JJ,AQs,KQs,AQo',
  },
  vsCutoff: {
    threeBet: 'JJ+,AQs+,AKo',
    call: '88-TT,ATs-AJs,KTs+,QJs,JTs,AJo+,KQo',
  },
  vsLate: {
    threeBet: 'TT+,AJs+,KQs,AQo+',
    call: '55-99,A5s-ATs,K9s+,Q9s+,J9s+,T9s,98s,87s,ATo+,KJo+,QJo',
  },
}

/**
 * 20bb: postflop play barely exists, so a flat call is rarely correct —
 * the call range shrinks to almost nothing, while the shove range widens
 * (shoving denies equity and carries heavy fold equity against an open).
 */
const RAW_TIERS_SHORT: Record<VsOpenTier, TierRanges> = {
  vsEarly: {
    threeBet: 'QQ+,AKs,AKo,AJs+',
    call: '99-TT',
  },
  vsCutoff: {
    threeBet: 'TT+,AQs+,AKo,A5s,KQs',
    call: '77-99',
  },
  vsLate: {
    threeBet: '77+,A2s+,K9s+,QTs+,JTs,ATo+,KJo+,A5o+',
    call: '22-66',
  },
}

const RAW_TIERS_BY_DEPTH: Record<ResponseDepth, Record<VsOpenTier, TierRanges>> = {
  deep: RAW_TIERS_DEEP,
  medium: RAW_TIERS_MEDIUM,
  short: RAW_TIERS_SHORT,
}

function buildTierRanges(
  raw: Record<VsOpenTier, TierRanges>,
): Record<VsOpenTier, { threeBet: Set<string>; call: Set<string> }> {
  return Object.fromEntries(
    Object.entries(raw).map(([tier, { threeBet, call }]) => [
      tier,
      { threeBet: parseRange(threeBet), call: parseRange(call) },
    ]),
  ) as Record<VsOpenTier, { threeBet: Set<string>; call: Set<string> }>
}

export const VS_OPEN_RANGES_BY_DEPTH: Record<
  ResponseDepth,
  Record<VsOpenTier, { threeBet: Set<string>; call: Set<string> }>
> = {
  deep: buildTierRanges(RAW_TIERS_BY_DEPTH.deep),
  medium: buildTierRanges(RAW_TIERS_BY_DEPTH.medium),
  short: buildTierRanges(RAW_TIERS_BY_DEPTH.short),
}

/** 100bb response ranges — used by the Range Explorer's range library. */
export const VS_OPEN_RANGES = VS_OPEN_RANGES_BY_DEPTH.deep

export function tierForOpenerPosition(position: Position): VsOpenTier {
  if (position === 'UTG' || position === 'MP') return 'vsEarly'
  if (position === 'CO') return 'vsCutoff'
  return 'vsLate' // BTN, SB
}

export type Vs3BetAction = 'fold' | 'call' | 'threeBet'

export function correctVsOpenAction(
  depth: ResponseDepth,
  tier: VsOpenTier,
  handLabel: string,
): Vs3BetAction {
  const { threeBet, call } = VS_OPEN_RANGES_BY_DEPTH[depth][tier]
  if (threeBet.has(handLabel)) return 'threeBet'
  if (call.has(handLabel)) return 'call'
  return 'fold'
}
