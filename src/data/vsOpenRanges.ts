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
 * 20bb: villain has already effectively shoved (20bb "open" = shove, see
 * STACK_DEPTH_ACTION_LABEL), and hero is also 20bb effective — so calling
 * and "3-betting"/shoving over are the same chip-EV action (both put in
 * hero's whole stack). There's only one real boundary here: continue or
 * fold. threeBet and call are set to the *same* computed range so either
 * button reads as correct (see isAcceptableVsOpenAction) — the call/shove
 * label split itself is just flavor, not a distinct equilibrium decision.
 *
 * That continue range was computed the same way as the 20bb shove ranges
 * in stackDepthRanges.ts: a chip-EV best-response Monte Carlo simulation
 * (500 trials/hand) of the BB calling range against each of those already-
 * solved shove ranges (BB used as caller — last to act, the standard
 * defend-the-blind benchmark), then averaged by EV across the two opener
 * positions each tier groups together (vsEarly = UTG/MP, vsLate =
 * BTN/SB; vsCutoff is just CO). Same simplifications as the shove ranges:
 * flat 20bb stacks, no ante, no ICM.
 */
function bothField(range: string): TierRanges {
  return { threeBet: range, call: range }
}
const RAW_TIERS_SHORT: Record<VsOpenTier, TierRanges> = {
  vsEarly: bothField('99+,AJs+,AKo'),
  vsCutoff: bothField('77,TT+,AJs+,AJo+'),
  vsLate: bothField('66+,A8s+,A9o+'),
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

/**
 * Whether `action` is an acceptable answer, not just the single canonical
 * one. At 20bb, call and threeBet are the same chip-EV action (see
 * RAW_TIERS_SHORT above), so either is correct whenever the canonical
 * answer isn't fold.
 */
export function isAcceptableVsOpenAction(
  depth: ResponseDepth,
  tier: VsOpenTier,
  handLabel: string,
  action: Vs3BetAction,
): boolean {
  const canonical = correctVsOpenAction(depth, tier, handLabel)
  if (action === canonical) return true
  if (depth === 'short' && canonical !== 'fold' && action !== 'fold') return true
  return false
}
