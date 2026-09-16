import { useMemo, useState } from 'react'
import type { Card } from '../lib/cards'
import { cardLabel, makeDeck, removeCards, shuffle } from '../lib/cards'
import { estimateEquityVsRange, estimateEquityVsMultipleRanges } from '../lib/equity'
import { CATEGORY_NAMES, evaluateBest } from '../lib/evaluator'
import { VILLAIN_RANGES, VILLAIN_RANGES_3BET } from '../data/villainRanges'
import { STACK_DEPTH_LABELS } from '../data/stackDepthRanges'
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
import { useScenarioMix, type StreetFocus } from '../lib/settings'
import { CardChip } from '../components/CardChip'
import { HintBox } from '../components/HintBox'
import { ScenarioMixToggle } from '../components/ScenarioMixToggle'
import { RangeGrid } from '../components/RangeGrid'

function streetName(boardSize: number): string {
  return boardSize === 3 ? 'the flop' : boardSize === 4 ? 'the turn' : 'the river'
}

type SizingAction = 'check' | 'betSmall' | 'betBig'

const ACTION_LABEL: Record<SizingAction, string> = {
  check: 'Check',
  betSmall: 'Bet Small (33%)',
  betBig: 'Bet Big (75%)',
}

const RATIONALE: Record<SizingAction, string> = {
  betBig: 'Strong equity edge — bet big to charge worse hands and get value.',
  betSmall: 'A thinner edge — a smaller bet keeps worse hands in / offers pot control.',
  check: 'Not enough of an edge to bet profitably here — check instead.',
}

type PotType = 'single' | 'threeBet' | 'multiway'

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

function scenarioPrompt(potType: PotType, ctx: PreflopContext, boardSize: number): string {
  const hero = seatLabel(ctx.heroPosition)
  const villain = seatLabel(ctx.villainPosition)
  const preflop =
    ctx.heroRole === 'opener'
      ? potType === 'threeBet'
        ? `You opened ${hero}, ${villain} 3-bet and you called.`
        : `You opened ${hero}, ${villain} called.`
      : `${villain} opened, you called from ${hero}.`
  const extra = potType === 'multiway' ? ' A third player also came along.' : ''
  const streetNote = boardSize > 3 ? ` Action checks through to ${streetName(boardSize)}.` : ''
  return `${preflop}${extra}${streetNote} It's on you, no bet in front of you yet. Check, bet small, or bet big?`
}

const DEPTH_HINTS: Record<PostflopDepth, string> = {
  deep: "At 100bb effective, there's plenty of stack left behind to build a big pot across multiple streets — thin value bets and pot-control lines are worth more.",
  medium: 'At 40bb, the stack-to-pot ratio is shrinking — sizing gets simpler, with less room for a multi-street plan.',
}

interface Scenario {
  hero: [Card, Card]
  board: Card[]
  pot: number
  depth: PostflopDepth
  potType: PotType
  context: PreflopContext
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

function boardSizeFor(streetFocus: StreetFocus): number {
  if (streetFocus === 'flop') return 3
  if (streetFocus === 'turn') return 4
  if (streetFocus === 'river') return 5
  return [3, 4, 5][randomInt(0, 2)]
}

/**
 * Villain's continuing range: their real preflop range for this line,
 * narrowed to a plausible "medium" continuing range (hero hasn't bet yet,
 * so there's no bet size to read — this is just used to estimate hero's
 * raw equity edge, not to model a real read).
 */
function villainRangesForScenario(potType: PotType, preflopRange: Set<string>): Set<string>[] {
  const tierRange = potType === 'threeBet' ? VILLAIN_RANGES_3BET.medium : VILLAIN_RANGES.medium
  const primary = intersectRanges(preflopRange, tierRange)
  if (potType === 'multiway') return [primary, VILLAIN_RANGES.medium]
  return [primary]
}

function newScenario(include3BetPots: boolean, includeMultiway: boolean, streetFocus: StreetFocus): Scenario {
  const depth = randomDepth()
  const potType = randomPotType(include3BetPots, includeMultiway)
  const context = newPreflopContext(depth, potType === 'threeBet')
  const deck = shuffle(removeCards(makeDeck(), context.heroHand))
  const boardSize = boardSizeFor(streetFocus)
  const board = deck.slice(0, boardSize)
  const [potMin, potMax] = POT_RANGE[depth]
  const pot = Math.round(randomInt(potMin, potMax) * POT_TYPE_MULTIPLIER[potType])
  return { hero: context.heroHand, board, pot, depth, potType, context }
}

function actionForEquity(equity: number): SizingAction {
  if (equity >= 0.65) return 'betBig'
  if (equity >= 0.45) return 'betSmall'
  return 'check'
}

export function BetSizingTrainer() {
  const { include3BetPots, includeMultiway, streetFocus } = useScenarioMix()
  const [scenario, setScenario] = useState<Scenario>(() =>
    newScenario(include3BetPots, includeMultiway, streetFocus),
  )
  const [answer, setAnswer] = useState<SizingAction | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showRange, setShowRange] = useState(false)

  // Villain is assumed to have a plausible continuing range — only used
  // here to estimate hero's raw equity edge, not to model a real read.
  const analysis = useMemo(() => {
    const ranges = villainRangesForScenario(scenario.potType, scenario.context.villainPreflopRange)
    const equityResult =
      ranges.length > 1
        ? estimateEquityVsMultipleRanges(scenario.hero, scenario.board, ranges, 700)
        : estimateEquityVsRange(scenario.hero, scenario.board, ranges[0], 800)
    const category = evaluateBest([...scenario.hero, ...scenario.board])
    return {
      equity: equityResult.equity,
      correctAnswer: actionForEquity(equityResult.equity),
      categoryName: CATEGORY_NAMES[category.category],
      finalRange: ranges[0],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

  function villainChartClass(label: string): string {
    if (analysis.finalRange.has(label)) return 'bg-rose-600/80 text-white'
    if (scenario.context.villainPreflopRange.has(label)) return 'bg-slate-600/70 text-slate-300'
    return 'bg-slate-800 text-slate-500'
  }

  const isCorrect = answer !== null && answer === analysis.correctAnswer

  function pick(choice: SizingAction) {
    if (answer !== null) return
    const wasCorrect = choice === analysis.correctAnswer
    setAnswer(choice)
    setScore((s) => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    const boardStr = scenario.board.map(cardLabel).join(' ').toUpperCase()
    recordAttempt({
      module: 'betsizing',
      moduleLabel: 'Bet Sizing',
      correct: wasCorrect,
      group: ACTION_LABEL[analysis.correctAnswer],
      detail: `${analysis.categoryName} on ${boardStr}, ${STACK_DEPTH_LABELS[scenario.depth]}, ${POT_TYPE_LABELS[scenario.potType]} (${seatLabel(scenario.context.heroPosition)} vs ${seatLabel(scenario.context.villainPosition)}) — you: ${ACTION_LABEL[choice]}, correct: ${ACTION_LABEL[analysis.correctAnswer]}`,
    })
  }

  function next() {
    setScenario(newScenario(include3BetPots, includeMultiway, streetFocus))
    setAnswer(null)
    setShowRange(false)
  }

  useHotkeys({
    x: () => pick('check'),
    s: () => pick('betSmall'),
    b: () => pick('betBig'),
    enter: () => answer !== null && next(),
    ' ': () => answer !== null && next(),
  })

  const smallBet = Math.round(scenario.pot * 0.33)
  const bigBet = Math.round(scenario.pot * 0.75)

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-400 text-sm text-center max-w-sm">
        {scenarioPrompt(scenario.potType, scenario.context, scenario.board.length)}
      </div>

      <div className="text-slate-300">
        Score: <span className="text-white font-semibold">{score.correct}</span> / {score.total}
        {score.total > 0 && (
          <span className="text-slate-500"> ({Math.round((score.correct / score.total) * 100)}%)</span>
        )}
      </div>

      <ScenarioMixToggle />

      <div className="flex flex-col items-center gap-2">
        <div className="text-sm text-slate-400">Board</div>
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

      <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-4 flex flex-col items-center gap-1 text-center">
        <div className="text-slate-400 text-xs">
          {STACK_DEPTH_LABELS[scenario.depth]} effective · {POT_TYPE_LABELS[scenario.potType]}
        </div>
        <div className="text-slate-400 text-xs">Pot</div>
        <div className="text-xl font-bold">${scenario.pot}</div>
      </div>

      {answer === null && (
        <HintBox>
          Bet size should track your equity edge: a big edge → bet big for value, a
          thin edge → bet small to keep worse hands in, no edge → check instead.{' '}
          {DEPTH_HINTS[scenario.depth]}
        </HintBox>
      )}

      {answer === null ? (
        <div className="flex gap-4">
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
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div
            className={[
              'px-4 py-2 rounded-lg font-semibold',
              isCorrect ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400',
            ].join(' ')}
          >
            {isCorrect
              ? 'Correct!'
              : `Not quite — correct answer is ${ACTION_LABEL[analysis.correctAnswer]}`}
          </div>
          <div className="text-sm text-slate-400 text-center max-w-sm">
            Your hand: {analysis.categoryName}
            <br />
            Estimated equity vs.{' '}
            {scenario.potType === 'multiway'
              ? "both opponents' continuing ranges"
              : "villain's continuing range"}
            {scenario.potType === 'threeBet' ? ' (3-bet pot)' : ''}:{' '}
            {(analysis.equity * 100).toFixed(1)}%
            <br />
            {RATIONALE[analysis.correctAnswer]}
          </div>

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
                  <span className="inline-block w-3 h-3 rounded-sm bg-rose-600/80" /> Continuing range
                  (equity computed against this)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-slate-600/70" /> Possible preflop, not a continuing hand
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
        A simplified equity-bucket heuristic (≥65% equity → bet big, ≥45% →
        bet small, else check) against villain's real preflop range for this
        line (same data as Preflop Ranges / Facing a Raise), not a solved
        sizing strategy — that also weighs blockers, board texture, and
        bluff-to-value ratios. Postflop decisions need postflop play to
        exist, so this drill only offers 100bb/40bb, not 20bb push/fold
        depth. Multiway pots estimate equity against two opponents at once,
        which is why the same hand often needs to check or bet smaller than
        it would heads-up.
      </p>
    </div>
  )
}
