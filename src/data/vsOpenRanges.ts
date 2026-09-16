import { parseRange } from '../lib/rangeNotation'
import { POSITIONS, type Position } from './preflopRanges'

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
 * open-raise, by the opener's exact position and by effective stack depth.
 * Rule-of-thumb approximations for training the fold/call/3-bet(shove)
 * decision, not a solved GTO output — real responses also depend on
 * hero's exact position (which this simplifies away), but every opener
 * position now gets its own range rather than being grouped into a tier.
 */
const RAW_POSITIONS_DEEP: Record<Position, TierRanges> = {
  UTG: { threeBet: 'QQ+,AKs,AKo', call: 'TT-JJ,AQs,KQs,AQo' },
  MP: { threeBet: 'QQ+,AKs,AKo,AJs', call: '99-JJ,ATs,AQs,KTs,KQs,AJo,AQo' },
  CO: { threeBet: 'JJ+,AQs+,AKo,A5s', call: '77-TT,A9s-AJs,KTs+,QJs,JTs,T9s,98s,87s,AJo,AQo,KQo' },
  BTN: {
    threeBet: 'TT+,AJs+,KQs,AQo+,A5s,A4s,A3s',
    call: '22-99,A2s,A6s-ATs,K9s-KJs,Q8s+,J8s+,T8s+,97s+,86s+,75s+,64s+,53s+,43s,ATo-AJo,K9o+,QTo+,JTo',
  },
  SB: { threeBet: 'JJ+,AQs+,AKo,A5s,A4s', call: '55-99,A6s-AJs,K9s+,Q9s+,J9s+,T9s,98s,87s,ATo-AQo,KJo+,QJo' },
}

/**
 * 40bb: the call range tightens (speculative small suited/offsuit hands
 * lose value as implied odds shrink), 3-bet ranges tighten slightly too.
 */
const RAW_POSITIONS_MEDIUM: Record<Position, TierRanges> = {
  UTG: { threeBet: 'QQ+,AKs,AKo', call: 'JJ,AQs,KQs' },
  MP: { threeBet: 'QQ+,AKs,AKo', call: 'TT-JJ,AQs,KQs,AQo' },
  CO: { threeBet: 'JJ+,AQs+,AKo', call: '88-TT,ATs-AJs,KTs+,QJs,JTs,AJo-AQo,KQo' },
  BTN: {
    threeBet: 'TT+,AJs+,KQs,AQo+,A5s',
    call: '44-99,A6s-ATs,K9s-KJs,Q9s+,J9s+,T9s,98s,87s,76s,ATo-AJo,KJo+,QJo',
  },
  SB: { threeBet: 'JJ+,AJs+,KQs,AQo+', call: '66-99,A7s-ATs,K9s-KJs,Q9s+,J9s+,T9s,98s,ATo-AJo,KJo+,QJo' },
}

/**
 * 20bb: villain has already effectively shoved (20bb "open" = shove, see
 * STACK_DEPTH_ACTION_LABEL), and hero is also 20bb effective — so calling
 * and "3-betting"/shoving over are the same chip-EV action (both put in
 * hero's whole stack). There's only one real boundary here: continue or
 * fold. threeBet and call are set to the *same* computed range so either
 * button is accepted (see isAcceptableVsOpenAction) — the call/shove
 * label split itself is just flavor, not a distinct equilibrium decision.
 *
 * That continue range is a chip-EV best-response Monte Carlo simulation
 * (500 trials/hand) of the BB calling range against each of the five
 * already-solved 20bb shove ranges in stackDepthRanges.ts (BB used as
 * caller — last to act, the standard defend-the-blind benchmark), one
 * per exact opener position. Same simplifications as the shove ranges:
 * flat 20bb stacks, no ante, no ICM.
 */
function bothField(range: string): TierRanges {
  return { threeBet: range, call: range }
}
const RAW_POSITIONS_SHORT: Record<Position, TierRanges> = {
  UTG: bothField('TT+,AQs+,AKo'),
  MP: bothField('99+,AJs+,AKo'),
  CO: bothField('77,TT+,AJs+,AJo+'),
  BTN: bothField('66+,A9s+,ATo+'),
  SB: bothField('44+,A4s,A7s+,KJs+,A8o+'),
}

const RAW_POSITIONS_BY_DEPTH: Record<ResponseDepth, Record<Position, TierRanges>> = {
  deep: RAW_POSITIONS_DEEP,
  medium: RAW_POSITIONS_MEDIUM,
  short: RAW_POSITIONS_SHORT,
}

function buildPositionRanges(
  raw: Record<Position, TierRanges>,
): Record<Position, { threeBet: Set<string>; call: Set<string> }> {
  return Object.fromEntries(
    POSITIONS.map((pos) => [pos, { threeBet: parseRange(raw[pos].threeBet), call: parseRange(raw[pos].call) }]),
  ) as Record<Position, { threeBet: Set<string>; call: Set<string> }>
}

export const VS_OPEN_RANGES_BY_DEPTH: Record<
  ResponseDepth,
  Record<Position, { threeBet: Set<string>; call: Set<string> }>
> = {
  deep: buildPositionRanges(RAW_POSITIONS_BY_DEPTH.deep),
  medium: buildPositionRanges(RAW_POSITIONS_BY_DEPTH.medium),
  short: buildPositionRanges(RAW_POSITIONS_BY_DEPTH.short),
}

/** 100bb response ranges — used by the Range Explorer's range library. */
export const VS_OPEN_RANGES = VS_OPEN_RANGES_BY_DEPTH.deep

export type Vs3BetAction = 'fold' | 'call' | 'threeBet'

export function correctVsOpenAction(
  depth: ResponseDepth,
  openerPosition: Position,
  handLabel: string,
): Vs3BetAction {
  const { threeBet, call } = VS_OPEN_RANGES_BY_DEPTH[depth][openerPosition]
  if (threeBet.has(handLabel)) return 'threeBet'
  if (call.has(handLabel)) return 'call'
  return 'fold'
}

/**
 * A small hand-picked set of boundary hands per opener position — the
 * single weakest hand currently inside that position's call range — that
 * real solves commonly mix between call and fold rather than playing
 * purely one way. Graded as accepting either action. Only at 100bb/40bb;
 * the 20bb boundary is an actually-computed Nash equilibrium (a pure
 * threshold, not a mix), and is already handled separately above by
 * merging call/threeBet into one accepted action.
 */
const RAW_MIXED_CALL: Record<Exclude<ResponseDepth, 'short'>, Record<Position, string>> = {
  deep: { UTG: 'TT', MP: '99', CO: '87s', BTN: '43s', SB: '87s' },
  medium: { UTG: 'JJ', MP: 'TT', CO: 'JTs', BTN: '76s', SB: '98s' },
}

function buildSingleHandSets(raw: Record<Position, string>): Record<Position, Set<string>> {
  return Object.fromEntries(POSITIONS.map((pos) => [pos, new Set([raw[pos]])])) as Record<Position, Set<string>>
}

export const MIXED_CALL_HANDS: Record<ResponseDepth, Record<Position, Set<string>>> = {
  deep: buildSingleHandSets(RAW_MIXED_CALL.deep),
  medium: buildSingleHandSets(RAW_MIXED_CALL.medium),
  short: Object.fromEntries(POSITIONS.map((pos) => [pos, new Set<string>()])) as Record<Position, Set<string>>,
}

export function isMixedCallHand(depth: ResponseDepth, openerPosition: Position, handLabel: string): boolean {
  return MIXED_CALL_HANDS[depth][openerPosition].has(handLabel)
}

/**
 * Whether `action` is an acceptable answer, not just the single canonical
 * one. At 20bb, call and threeBet are the same chip-EV action (see
 * RAW_POSITIONS_SHORT above), so either is correct whenever the canonical
 * answer isn't fold. At 100bb/40bb, a small set of hand-picked boundary
 * hands mix call and fold (see RAW_MIXED_CALL above).
 */
export function isAcceptableVsOpenAction(
  depth: ResponseDepth,
  openerPosition: Position,
  handLabel: string,
  action: Vs3BetAction,
): boolean {
  const canonical = correctVsOpenAction(depth, openerPosition, handLabel)
  if (action === canonical) return true
  if (depth === 'short' && canonical !== 'fold' && action !== 'fold') return true
  if (isMixedCallHand(depth, openerPosition, handLabel) && (action === 'call' || action === 'fold')) return true
  return false
}
