import { useMemo, useState } from 'react'
import type { Card } from '../lib/cards'
import { cardLabel, handLabel, makeDeck, removeCards, shuffle } from '../lib/cards'
import {
  estimateEquityVsRange,
  estimateEquityVsMultipleRanges,
  evOfCall,
  potOdds,
  splitRangeByStrength,
  buildBalancedRange,
  type BalancedRangeResult,
} from '../lib/equity'
import { CATEGORY_NAMES, evaluateBest } from '../lib/evaluator'
import { VILLAIN_RANGES, VILLAIN_RANGES_3BET, villainRangeForBet, type VillainRangeTier } from '../data/villainRanges'
import { STACK_DEPTH_LABELS, STACK_DEPTH_RANGES } from '../data/stackDepthRanges'
import { VS_OPEN_RANGES_BY_DEPTH } from '../data/vsOpenRanges'
import type { Position } from '../data/preflopRanges'
import { intersectRanges } from '../lib/rangeCombos'
import {
  newPreflopContext,
  seatLabel,
  POSTFLOP_DEPTHS,
  type PostflopDepth,
  type PreflopContext,
} from '../lib/preflopContext'
import { useHotkeys } from '../lib/useHotkeys'
import { recordAttempt } from '../lib/progressStore'
import { groupWeights, weightedPick } from '../lib/adaptivePractice'
import { useScenarioMix, useTeachingMode } from '../lib/settings'
import { CardChip } from '../components/CardChip'
import { HintBox } from '../components/HintBox'
import { ScenarioMixToggle } from '../components/ScenarioMixToggle'
import { RangeGrid } from '../components/RangeGrid'

type PotType = 'single' | 'threeBet' | 'multiway'
type FlopKind = 'facingBet' | 'firstToAct'
type FlopAction = 'fold' | 'call' | 'raise' | 'check' | 'betSmall' | 'betBig'
type Street = 'flop' | 'turn' | 'river'

const ACTION_LABEL: Record<FlopAction, string> = {
  fold: 'Fold',
  call: 'Call',
  raise: 'Raise',
  check: 'Check',
  betSmall: 'Bet Small (33%)',
  betBig: 'Bet Big (75%)',
}

const STREETS: Street[] = ['flop', 'turn', 'river']
const STREET_LABELS: Record<Street, string> = { flop: 'Flop', turn: 'Turn', river: 'River' }
const STREET_BOARD_SIZE: Record<Street, number> = { flop: 3, turn: 4, river: 5 }
// More streets of betting have already gone in by the time you reach the
// turn/river, so pots run bigger — a rough scale-up, not a tracked history.
const STREET_POT_MULTIPLIER: Record<Street, number> = { flop: 1, turn: 1.4, river: 1.9 }

interface Scenario {
  hero: [Card, Card]
  board: Card[] // 3 (flop), 4 (turn), or 5 (river) cards
  street: Street
  pot: number
  bet: number // 0 for firstToAct (hero acts before any bet)
  depth: PostflopDepth
  potType: PotType
  context: PreflopContext
  kind: FlopKind
}

// Shallower effective stacks mean less money has gone into (and can still go
// into) the pot, so pot size scales down with depth.
const POT_RANGE: Record<PostflopDepth, [number, number]> = {
  deep: [30, 250],
  medium: [15, 110],
}

// 3-bet pots start with more preflop money in; multiway pots tend to build
// bigger too since more players contributed preflop.
const POT_TYPE_MULTIPLIER: Record<PotType, number> = { single: 1, threeBet: 1.8, multiway: 1.3 }

const POT_TYPE_LABELS: Record<PotType, string> = {
  single: 'Single-raised pot',
  threeBet: '3-bet pot',
  multiway: 'Multiway (3-handed)',
}

function scenarioPrompt(kind: FlopKind, potType: PotType, street: Street, ctx: PreflopContext): string {
  const hero = seatLabel(ctx.heroPosition)
  const villain = seatLabel(ctx.villainPosition)
  const preflop =
    ctx.heroRole === 'opener'
      ? potType === 'threeBet'
        ? `You opened ${hero}, ${villain} 3-bet and you called.`
        : `You opened ${hero}, ${villain} called.`
      : `${villain} opened, you called from ${hero}.`
  const extra = potType === 'multiway' ? ' A third player also came along.' : ''
  const streetLabel = STREET_LABELS[street].toLowerCase()
  const action =
    kind === 'facingBet'
      ? `Villain bets the ${streetLabel}. Fold, call, or raise?`
      : `It's on you on the ${streetLabel}, no bet in front of you yet. Check, bet small, or bet big?`
  return `${preflop}${extra} ${action}`
}

const FACING_BET_DEPTH_HINTS: Record<PostflopDepth, string> = {
  deep: "At 100bb effective, a drawing hand can win extra money on later streets if it hits — real implied odds can make a call correct even a bit below the raw equity-vs-pot-odds comparison.",
  medium: "At 40bb, there's less behind to win on future streets, so implied odds add less cushion — lean closer to the raw equity comparison.",
}

const FIRST_TO_ACT_DEPTH_HINTS: Record<PostflopDepth, string> = {
  deep: "At 100bb effective, there's plenty of stack left behind to build a big pot across multiple streets — thin value bets and pot-control lines are worth more.",
  medium: 'At 40bb, the stack-to-pot ratio is shrinking — sizing gets simpler, with less room for a multi-street plan.',
}

/** Implied odds only exist if there are streets left to come — not on the river. */
function facingBetDepthHint(depth: PostflopDepth, street: Street): string {
  if (street === 'river') {
    return "This is the final street — no more cards to come, so there's no implied odds to lean on: it's a pure equity-vs-pot-odds comparison."
  }
  return FACING_BET_DEPTH_HINTS[depth]
}

/** Multi-street planning doesn't apply on the last street either. */
function firstToActDepthHint(depth: PostflopDepth, street: Street): string {
  if (street === 'river') {
    return "This is the final street — sizing here is really about value/bluff balance and getting called by worse, not planning across future streets."
  }
  return FIRST_TO_ACT_DEPTH_HINTS[depth]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDepth(): PostflopDepth {
  return POSTFLOP_DEPTHS[Math.floor(Math.random() * POSTFLOP_DEPTHS.length)]
}

function randomPotType(include3BetPots: boolean, includeMultiway: boolean): PotType {
  const options: PotType[] = ['single']
  if (include3BetPots) options.push('threeBet')
  if (includeMultiway) options.push('multiway')
  return options[randomInt(0, options.length - 1)]
}

function randomStreet(): Street {
  return STREETS[Math.floor(Math.random() * STREETS.length)]
}

/**
 * Villain range(s) to estimate hero's equity against when facing a bet: the
 * real preflop range for this line (see preflopContext.ts), narrowed to
 * whichever hands would actually bet this size on this board — history and
 * bet size together, not either alone. Multiway keeps a second, un-narrowed
 * opponent, since there's no real preflop line for who that extra player is.
 */
function villainRangesFacingBet(
  potType: PotType,
  preflopRange: Set<string>,
  tier: 'wide' | 'medium' | 'tight',
): Set<string>[] {
  const betTierRange = potType === 'threeBet' ? VILLAIN_RANGES_3BET[tier] : VILLAIN_RANGES[tier]
  const primary = intersectRanges(preflopRange, betTierRange)
  if (potType === 'multiway') return [primary, VILLAIN_RANGES[tier]]
  return [primary]
}

/** Same idea when hero acts first: no bet size to read, so a fixed "medium" continuing tier. */
function villainRangesFirstToAct(potType: PotType, preflopRange: Set<string>): Set<string>[] {
  const tierRange = potType === 'threeBet' ? VILLAIN_RANGES_3BET.medium : VILLAIN_RANGES.medium
  const primary = intersectRanges(preflopRange, tierRange)
  if (potType === 'multiway') return [primary, VILLAIN_RANGES.medium]
  return [primary]
}

// Simplified raise model: raise to a fixed multiplier of the bet, and assume
// villain continues with roughly their strongest third of range and folds
// the rest — not a solved sizing/response, just enough to compare fold
// equity + re-raised equity against the plain call.
const RAISE_MULTIPLIER = 3
const RAISE_CONTINUE_FRACTION = 0.35

function evRaise(
  heroCombo: [Card, Card],
  board: Card[],
  villainRange: Set<string>,
  pot: number,
  bet: number,
  trials: number,
): { ev: number; raiseTo: number; foldProb: number } {
  const split = splitRangeByStrength(villainRange, board, heroCombo, RAISE_CONTINUE_FRACTION)
  const raiseTo = Math.round(bet * RAISE_MULTIPLIER)
  if (split.continuing.size === 0) {
    return { ev: pot, raiseTo, foldProb: 1 }
  }
  const equityResult = estimateEquityVsRange(heroCombo, board, split.continuing, trials)
  const finalPot = pot + 2 * raiseTo - bet
  const evIfCalled = equityResult.equity * finalPot - raiseTo
  const ev = split.foldProb * pot + split.continueProb * evIfCalled
  return { ev, raiseTo, foldProb: split.foldProb }
}

/** Hero's own real preflop range for this line — same data as villain's, mirrored for hero's role. */
function heroPreflopRange(depth: PostflopDepth, context: PreflopContext): Set<string> {
  if (context.heroRole === 'opener') {
    return STACK_DEPTH_RANGES[depth][context.heroPosition as Position]
  }
  return VS_OPEN_RANGES_BY_DEPTH[depth][context.villainPosition as Position].call
}

function actionForEquity(equity: number): 'check' | 'betSmall' | 'betBig' {
  if (equity >= 0.65) return 'betBig'
  if (equity >= 0.45) return 'betSmall'
  return 'check'
}

// Bet-size fraction ranges that produce each villainRangeForBet tier — used
// to bias which tier shows up more, without touching villainRangeForBet's
// own thresholds.
const TIER_FRACTION_RANGE: Record<VillainRangeTier, [number, number]> = {
  wide: [30, 49],
  medium: [50, 84],
  tight: [85, 110],
}
const TIERS: VillainRangeTier[] = ['wide', 'medium', 'tight']

/**
 * Adaptive practice: bet-size tiers you've missed more often on the
 * "facing a bet" scenario (per the Progress tab's own tier accuracy) come
 * up more often, via groupWeights — uniform random until there's enough
 * history to act on. Tier is derived purely from bet/pot ratio, so this
 * biases which fraction sub-range the bet is drawn from rather than the
 * tier directly.
 */
function randomBetFraction(): number {
  const tier = weightedPick(TIERS, groupWeights('postflop'), (t) => t)
  const [lo, hi] = TIER_FRACTION_RANGE[tier]
  return randomInt(lo, hi) / 100
}

function newScenario(include3BetPots: boolean, includeMultiway: boolean): Scenario {
  const depth = randomDepth()
  const potType = randomPotType(include3BetPots, includeMultiway)
  const context = newPreflopContext(depth, potType === 'threeBet')
  const street = randomStreet()
  const deck = shuffle(removeCards(makeDeck(), context.heroHand))
  const board = deck.slice(0, STREET_BOARD_SIZE[street])
  const kind: FlopKind = Math.random() < 0.5 ? 'facingBet' : 'firstToAct'
  const [potMin, potMax] = POT_RANGE[depth]
  const pot = Math.round(randomInt(potMin, potMax) * POT_TYPE_MULTIPLIER[potType] * STREET_POT_MULTIPLIER[street])
  const bet = kind === 'facingBet' ? Math.round(pot * randomBetFraction()) : 0
  return { hero: context.heroHand, board, street, pot, bet, depth, potType, context, kind }
}

type Analysis =
  | {
      kind: 'facingBet'
      equity: number
      required: number
      evFold: number
      evCall: number
      evRaise: number
      raiseTo: number
      raiseFoldProb: number
      correctAnswer: 'fold' | 'call' | 'raise'
      categoryName: string
      tier: 'wide' | 'medium' | 'tight'
      finalRange: Set<string>
    }
  | {
      kind: 'firstToAct'
      equity: number
      correctAnswer: 'check' | 'betSmall' | 'betBig'
      categoryName: string
      finalRange: Set<string>
    }

export function PostflopTrainer() {
  const { include3BetPots, includeMultiway } = useScenarioMix()
  const { teachingMode } = useTeachingMode()
  const [scenario, setScenario] = useState<Scenario>(() => newScenario(include3BetPots, includeMultiway))
  const [answer, setAnswer] = useState<FlopAction | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showRange, setShowRange] = useState(false)
  const [showBalanced, setShowBalanced] = useState(false)

  // Only run the (moderately expensive) Monte Carlo once per scenario.
  const analysis: Analysis = useMemo(() => {
    const category = evaluateBest([...scenario.hero, ...scenario.board])
    const categoryName = CATEGORY_NAMES[category.category]

    if (scenario.kind === 'firstToAct') {
      const ranges = villainRangesFirstToAct(scenario.potType, scenario.context.villainPreflopRange)
      const equityResult =
        ranges.length > 1
          ? estimateEquityVsMultipleRanges(scenario.hero, scenario.board, ranges, 700)
          : estimateEquityVsRange(scenario.hero, scenario.board, ranges[0], 800)
      return {
        kind: 'firstToAct',
        equity: equityResult.equity,
        correctAnswer: actionForEquity(equityResult.equity),
        categoryName,
        finalRange: ranges[0],
      }
    }

    const tier = villainRangeForBet(scenario.bet, scenario.pot)
    const ranges = villainRangesFacingBet(scenario.potType, scenario.context.villainPreflopRange, tier)
    const equityResult =
      ranges.length > 1
        ? estimateEquityVsMultipleRanges(scenario.hero, scenario.board, ranges, 700)
        : estimateEquityVsRange(scenario.hero, scenario.board, ranges[0], 800)
    const required = potOdds(scenario.bet, scenario.pot)
    const evCall = evOfCall(equityResult.equity, scenario.pot, scenario.bet)
    const raise = evRaise(scenario.hero, scenario.board, ranges[0], scenario.pot, scenario.bet, 500)
    const evFold = 0
    let correctAnswer: 'fold' | 'call' | 'raise' = 'fold'
    let best = evFold
    if (evCall > best) {
      correctAnswer = 'call'
      best = evCall
    }
    if (raise.ev > best) correctAnswer = 'raise'
    return {
      kind: 'facingBet',
      equity: equityResult.equity,
      required,
      evFold,
      evCall,
      evRaise: raise.ev,
      raiseTo: raise.raiseTo,
      raiseFoldProb: raise.foldProb,
      correctAnswer,
      categoryName,
      tier,
      finalRange: ranges[0],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

  function villainChartClass(label: string): string {
    if (analysis.finalRange.has(label)) return 'bg-rose-600/80 text-white'
    if (scenario.context.villainPreflopRange.has(label)) return 'bg-slate-600/70 text-slate-300'
    return 'bg-slate-800 text-slate-500'
  }

  function pick(action: FlopAction) {
    if (answer !== null) return
    if (scenario.kind === 'facingBet' && !(action === 'fold' || action === 'call' || action === 'raise')) return
    if (scenario.kind === 'firstToAct' && !(action === 'check' || action === 'betSmall' || action === 'betBig')) return

    const wasCorrect = action === analysis.correctAnswer
    setAnswer(action)
    setScore((s) => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    const boardStr = scenario.board.map(cardLabel).join(' ').toUpperCase()
    const seats = `${seatLabel(scenario.context.heroPosition)} vs ${seatLabel(scenario.context.villainPosition)}`
    const streetLabel = STREET_LABELS[scenario.street]
    if (analysis.kind === 'facingBet') {
      recordAttempt({
        module: 'postflop',
        moduleLabel: 'Postflop: Facing a Bet',
        correct: wasCorrect,
        group: analysis.tier,
        detail: `${analysis.categoryName} on ${streetLabel} ${boardStr} vs ${analysis.tier} range, ${STACK_DEPTH_LABELS[scenario.depth]}, ${POT_TYPE_LABELS[scenario.potType]} (${seats}) — you: ${ACTION_LABEL[action]}, correct: ${ACTION_LABEL[analysis.correctAnswer]}`,
      })
    } else {
      recordAttempt({
        module: 'betsizing',
        moduleLabel: 'Postflop: First to Act',
        correct: wasCorrect,
        group: ACTION_LABEL[analysis.correctAnswer],
        detail: `${analysis.categoryName} on ${streetLabel} ${boardStr}, ${STACK_DEPTH_LABELS[scenario.depth]}, ${POT_TYPE_LABELS[scenario.potType]} (${seats}) — you: ${ACTION_LABEL[action]}, correct: ${ACTION_LABEL[analysis.correctAnswer]}`,
      })
    }
  }

  function next() {
    setScenario(newScenario(include3BetPots, includeMultiway))
    setAnswer(null)
    setShowRange(false)
    setShowBalanced(false)
  }

  useHotkeys({
    f: () => pick('fold'),
    c: () => pick('call'),
    r: () => pick('raise'),
    x: () => pick('check'),
    s: () => pick('betSmall'),
    b: () => pick('betBig'),
    enter: () => answer !== null && next(),
    ' ': () => answer !== null && next(),
  })

  const isCorrect = answer !== null && answer === analysis.correctAnswer
  const smallBet = Math.round(scenario.pot * 0.33)
  const bigBet = Math.round(scenario.pot * 0.75)

  // Teaching-mode-only illustration, first-to-act only (betting your whole
  // range is the natural spot for this) — cheap to compute (no Monte Carlo).
  const balancedRange: BalancedRangeResult | null =
    scenario.kind === 'firstToAct'
      ? buildBalancedRange(heroPreflopRange(scenario.depth, scenario.context), scenario.board, scenario.hero, smallBet, scenario.pot)
      : null

  function balancedRangeChartClass(label: string): string {
    if (!balancedRange) return 'bg-slate-800 text-slate-500'
    if (balancedRange.value.has(label)) return 'bg-amber-600/80 text-white'
    if (balancedRange.bluff.has(label)) return 'bg-rose-600/80 text-white'
    if (balancedRange.giveUp.has(label)) return 'bg-slate-600/70 text-slate-300'
    return 'bg-slate-800 text-slate-500'
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-300">
        Score: <span className="text-white font-semibold">{score.correct}</span> / {score.total}
        {score.total > 0 && (
          <span className="text-slate-500"> ({Math.round((score.correct / score.total) * 100)}%)</span>
        )}
      </div>

      <ScenarioMixToggle />

      <div className="flex flex-col items-center gap-2">
        <div className="text-sm text-slate-400">{STREET_LABELS[scenario.street]}</div>
        <div key={scenario.board.map(cardLabel).join()} className="flex gap-2 animate-pop-in">
          {scenario.board.map((c) => (
            <CardChip key={cardLabel(c)} card={c} />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-sm text-slate-400">Your hand</div>
        <div key={scenario.hero.map(cardLabel).join()} className="flex gap-2 animate-pop-in">
          {scenario.hero.map((c) => (
            <CardChip key={cardLabel(c)} card={c} />
          ))}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-4 flex flex-col items-center gap-2 text-center">
        <div className="text-slate-400 text-xs">
          {STACK_DEPTH_LABELS[scenario.depth]} effective · {POT_TYPE_LABELS[scenario.potType]}
        </div>
        {scenario.kind === 'facingBet' ? (
          <div className="flex gap-8">
            <div>
              <div className="text-slate-400 text-xs">Pot</div>
              <div className="text-xl font-bold">${scenario.pot}</div>
            </div>
            <div>
              <div className="text-slate-400 text-xs">Villain bets</div>
              <div className="text-xl font-bold">${scenario.bet}</div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-slate-400 text-xs">Pot</div>
            <div className="text-xl font-bold">${scenario.pot}</div>
          </div>
        )}
      </div>

      <p className="text-slate-300 text-center max-w-sm">
        {scenarioPrompt(scenario.kind, scenario.potType, scenario.street, scenario.context)}
      </p>

      {answer === null && (
        <HintBox>
          {scenario.kind === 'facingBet' ? (
            <>
              You need {(analysis.kind === 'facingBet' ? analysis.required * 100 : 0).toFixed(1)}% equity to
              call profitably here (bet / (pot + bet)). A raise adds fold equity on top of that — it wins
              outright whenever villain folds, but needs to beat their (tighter) continuing range the rest of
              the time. {facingBetDepthHint(scenario.depth, scenario.street)}
            </>
          ) : (
            <>
              Bet size should track your equity edge: a big edge → bet big for value, a thin edge → bet small
              to keep worse hands in, no edge → check instead. {firstToActDepthHint(scenario.depth, scenario.street)}
            </>
          )}
        </HintBox>
      )}

      {teachingMode && answer === null && (
        <div className="w-full max-w-xl flex flex-col items-center gap-2 animate-fade-in">
          <div className="text-xs text-slate-400">
            Villain's range, narrowed from their preflop line{scenario.kind === 'facingBet' ? ' and this bet size' : ''}:
          </div>
          <RangeGrid cellClass={villainChartClass} />
          <div className="flex gap-4 text-xs text-slate-400 flex-wrap justify-center">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-600/80" />{' '}
              {scenario.kind === 'facingBet' ? 'Bets this size' : 'Continuing range'}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-600/70" /> Possible preflop, not this
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-800 border border-slate-600" />{' '}
              Not possible given the preflop action
            </span>
          </div>
        </div>
      )}

      {teachingMode && scenario.kind === 'firstToAct' && answer === null && balancedRange && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => setShowBalanced((v) => !v)}
            className="text-sm text-slate-400 underline hover:text-slate-200"
          >
            {showBalanced ? 'Hide' : 'Show'} balanced range (advanced)
          </button>
          {showBalanced && (
            <div className="w-full max-w-xl flex flex-col items-center gap-2 animate-fade-in">
              <div className="text-xs text-slate-400 text-center max-w-sm">
                A simplified illustration: if you bet ${smallBet} (33% pot) with your <em>whole</em> range here,
                the top {(balancedRange.valueFraction * 100).toFixed(0)}% of it bets for value, your very
                weakest hands fill a bluff quota sized so villain is mathematically indifferent to calling a
                bluff-catcher (bluffs should make up ≈
                {(balancedRange.optimalBluffRatioWithinBets * 100).toFixed(0)}% of the betting range — bet /
                (pot + 2×bet)), and everything in between checks.
              </div>
              <RangeGrid cellClass={balancedRangeChartClass} highlight={handLabel(scenario.hero[0], scenario.hero[1])} />
              <div className="flex gap-4 text-xs text-slate-400 flex-wrap justify-center">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-600/80" /> Value bet
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-rose-600/80" /> Bluff
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-slate-600/70" /> Check
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {answer === null ? (
        <div className="flex gap-4 flex-wrap justify-center">
          {scenario.kind === 'facingBet' ? (
            <>
              <button
                onClick={() => pick('call')}
                className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform font-semibold text-white"
              >
                Call <span className="text-emerald-200 text-xs font-normal">(C)</span>
              </button>
              <button
                onClick={() => pick('raise')}
                className="px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 transition-transform font-semibold text-white"
              >
                Raise to ${analysis.kind === 'facingBet' ? analysis.raiseTo : 0}{' '}
                <span className="text-amber-100 text-xs font-normal">(R)</span>
              </button>
              <button
                onClick={() => pick('fold')}
                className="px-5 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 transition-transform font-semibold text-white"
              >
                Fold <span className="text-rose-200 text-xs font-normal">(F)</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => pick('check')}
                className="px-5 py-3 rounded-lg bg-slate-600 hover:bg-slate-500 active:scale-95 transition-transform font-semibold text-white"
              >
                Check <span className="text-slate-300 text-xs font-normal">(X)</span>
              </button>
              <button
                onClick={() => pick('betSmall')}
                className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform font-semibold text-white"
              >
                Bet ${smallBet} <span className="text-emerald-200 text-xs font-normal">(S)</span>
              </button>
              <button
                onClick={() => pick('betBig')}
                className="px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 transition-transform font-semibold text-white"
              >
                Bet ${bigBet} <span className="text-amber-100 text-xs font-normal">(B)</span>
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div
            className={[
              'px-4 py-2 rounded-lg font-semibold',
              isCorrect ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400',
            ].join(' ')}
          >
            {isCorrect ? 'Correct!' : `Not quite — correct answer is ${ACTION_LABEL[analysis.correctAnswer]}`}
          </div>

          {analysis.kind === 'facingBet' ? (
            <div className="text-sm text-slate-400 text-center max-w-sm">
              Your hand: {analysis.categoryName}
              <br />
              Estimated equity vs.{' '}
              {scenario.potType === 'multiway'
                ? `both opponents' ${analysis.tier}-consistent ranges`
                : `villain's ${analysis.tier}-consistent range`}
              : {(analysis.equity * 100).toFixed(1)}% (required to call: {(analysis.required * 100).toFixed(1)}%)
              <br />
              EV(fold) = $0.00 · EV(call) = ${analysis.evCall.toFixed(2)} · EV(raise to $
              {analysis.raiseTo}) = ${analysis.evRaise.toFixed(2)}
              <br />
              <span className="text-xs">
                Raising, villain folds an estimated {(analysis.raiseFoldProb * 100).toFixed(0)}% and continues
                with their strongest hands the rest of the time.
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-400 text-center max-w-sm">
              Your hand: {analysis.categoryName}
              <br />
              Estimated equity vs.{' '}
              {scenario.potType === 'multiway' ? "both opponents' continuing ranges" : "villain's continuing range"}:{' '}
              {(analysis.equity * 100).toFixed(1)}%
              <br />
              {analysis.correctAnswer === 'betBig'
                ? 'Strong equity edge — bet big to charge worse hands and get value.'
                : analysis.correctAnswer === 'betSmall'
                  ? 'A thinner edge — a smaller bet keeps worse hands in / offers pot control.'
                  : 'Not enough of an edge to bet profitably here — check instead.'}
            </div>
          )}

          <button
            onClick={() => setShowRange((v) => !v)}
            className="text-sm text-slate-400 underline hover:text-slate-200"
          >
            {showRange ? 'Hide' : 'Show'} villain's range
          </button>

          {showRange && (
            <div className="w-full max-w-xl flex flex-col items-center gap-2 animate-fade-in">
              <RangeGrid cellClass={villainChartClass} />
              <div className="flex gap-4 text-xs text-slate-400 flex-wrap justify-center">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-rose-600/80" />{' '}
                  {scenario.kind === 'facingBet' ? 'Bets this size' : 'Continuing range'} (equity computed
                  against this)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-slate-600/70" /> Possible preflop, not
                  this
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-slate-800 border border-slate-600" />{' '}
                  Not possible given the preflop action
                </span>
              </div>
            </div>
          )}

          <button
            onClick={next}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Next scenario <span className="text-indigo-200 text-xs font-normal">(Enter)</span>
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500 max-w-md text-center">
        Each scenario is an independent snapshot on a random street (flop,
        turn, or river), not a hand played street by street — villain's
        range always narrows in one step, straight from their real preflop
        range for this line (same data as the Preflop drill) to whichever
        of those hands would actually bet/continue at this exact board and
        bet size, regardless of which street it is. It doesn't track
        separate action on earlier streets (e.g. what villain's range
        looks like on the river also reflects a check-through or a call on
        the flop/turn, but that intermediate action isn't simulated or
        shown) — a real hand's range narrows street by street, this
        narrows once. Raising uses a simplified model (raise to 3× the
        bet; villain continues with roughly their strongest third of
        range, folds the rest) — not a solved sizing or response. This
        drill only offers 100bb/40bb, not 20bb push/fold depth, since
        postflop play doesn't really exist there. Multiway pots estimate
        equity against two opponents at once. Teaching mode's "balanced
        range" panel (first-to-act only) illustrates the value/bluff/check
        split for hero's whole range using a fixed 30% value cutoff and
        the standard bet/(pot+2×bet) optimal-bluff-ratio formula — a
        teaching illustration of the ratio, not a solved range (real
        solves size the value cutoff from the board's specific range and
        nut advantage, not a constant).
      </p>
    </div>
  )
}
