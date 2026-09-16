import { useMemo, useState } from 'react'
import type { Card } from '../lib/cards'
import { cardLabel, makeDeck, removeCards, shuffle } from '../lib/cards'
import { estimateEquityVsRange, estimateEquityVsMultipleRanges, evOfCall, potOdds } from '../lib/equity'
import { CATEGORY_NAMES, evaluateBest } from '../lib/evaluator'
import { VILLAIN_RANGES, VILLAIN_RANGES_3BET, villainRangeForBet } from '../data/villainRanges'
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

type PotType = 'single' | 'threeBet' | 'multiway'

interface Scenario {
  hero: [Card, Card]
  board: Card[]
  pot: number
  bet: number
  depth: PostflopDepth
  potType: PotType
  context: PreflopContext
}

// Shallower effective stacks mean less money has gone into (and can still go
// into) the pot, so pot size scales down with depth. Bet-to-pot ratio stays
// the same distribution regardless of depth, since that's what drives
// villain's range tier.
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
  // A 4- or 5-card board with only one bet on the table means every earlier
  // street checked through — say so, instead of implying betting we didn't model.
  const action =
    boardSize === 3
      ? 'Villain bets.'
      : `Action checks through to ${streetName(boardSize)}, where villain bets.`
  if (ctx.heroRole === 'opener') {
    const preflop =
      potType === 'threeBet'
        ? `You opened ${hero}, ${villain} 3-bet and you called.`
        : `You opened ${hero}, ${villain} called.`
    const extra = potType === 'multiway' ? ' A third player also came along.' : ''
    return `${preflop}${extra} ${action} Call or fold?`
  }
  const extra = potType === 'multiway' ? ' A third player also came along.' : ''
  return `${villain} opened, you called from ${hero}.${extra} ${action} Call or fold?`
}

const DEPTH_HINTS: Record<PostflopDepth, string> = {
  deep: "At 100bb effective, a drawing hand can win extra money on later streets if it hits — real implied odds can make a call correct even a bit below the raw equity-vs-pot-odds comparison.",
  medium: "At 40bb, there's less behind to win on future streets, so implied odds add less cushion — lean closer to the raw equity comparison.",
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
 * Villain range(s) to estimate hero's equity against: the real preflop range
 * for this line (see preflopContext.ts), narrowed to whichever hands would
 * actually bet this size on this board (the existing bet-size-tier
 * heuristic) — combining "what happened preflop" with "what this bet means"
 * instead of assuming either alone. Multiway keeps a second, un-narrowed
 * opponent, since there's no real preflop line for who that extra player is.
 */
function villainRangesForScenario(
  potType: PotType,
  preflopRange: Set<string>,
  tier: 'wide' | 'medium' | 'tight',
): Set<string>[] {
  const betTierRange = potType === 'threeBet' ? VILLAIN_RANGES_3BET[tier] : VILLAIN_RANGES[tier]
  const primary = intersectRanges(preflopRange, betTierRange)
  if (potType === 'multiway') return [primary, VILLAIN_RANGES[tier]]
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
  const bet = Math.round(pot * (randomInt(30, 110) / 100))
  return { hero: context.heroHand, board, pot, bet, depth, potType, context }
}

export function PostflopTrainer() {
  const { include3BetPots, includeMultiway, streetFocus } = useScenarioMix()
  const [scenario, setScenario] = useState<Scenario>(() =>
    newScenario(include3BetPots, includeMultiway, streetFocus),
  )
  const [answer, setAnswer] = useState<'call' | 'fold' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showRange, setShowRange] = useState(false)

  // Only run the (moderately expensive) Monte Carlo once per scenario.
  const analysis = useMemo(() => {
    const tier = villainRangeForBet(scenario.bet, scenario.pot)
    const ranges = villainRangesForScenario(scenario.potType, scenario.context.villainPreflopRange, tier)
    const equityResult =
      ranges.length > 1
        ? estimateEquityVsMultipleRanges(scenario.hero, scenario.board, ranges, 700)
        : estimateEquityVsRange(scenario.hero, scenario.board, ranges[0], 800)
    const required = potOdds(scenario.bet, scenario.pot)
    const ev = evOfCall(equityResult.equity, scenario.pot, scenario.bet)
    const category = evaluateBest([...scenario.hero, ...scenario.board])
    return {
      equity: equityResult.equity,
      required,
      ev,
      tier,
      finalRange: ranges[0],
      correctAnswer: (equityResult.equity > required ? 'call' : 'fold') as 'call' | 'fold',
      categoryName: CATEGORY_NAMES[category.category],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

  function villainChartClass(label: string): string {
    if (analysis.finalRange.has(label)) return 'bg-rose-600/80 text-white'
    if (scenario.context.villainPreflopRange.has(label)) return 'bg-slate-600/70 text-slate-300'
    return 'bg-slate-800 text-slate-500'
  }

  function pick(choice: 'call' | 'fold') {
    if (answer !== null) return
    const wasCorrect = choice === analysis.correctAnswer
    setAnswer(choice)
    setScore((s) => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    const boardStr = scenario.board.map(cardLabel).join(' ').toUpperCase()
    recordAttempt({
      module: 'postflop',
      moduleLabel: 'Postflop Decisions',
      correct: wasCorrect,
      group: analysis.tier,
      detail: `${analysis.categoryName} on ${boardStr} vs ${analysis.tier} range, ${STACK_DEPTH_LABELS[scenario.depth]}, ${POT_TYPE_LABELS[scenario.potType]} (${seatLabel(scenario.context.heroPosition)} vs ${seatLabel(scenario.context.villainPosition)}) — you: ${choice}, correct: ${analysis.correctAnswer}`,
    })
  }

  function next() {
    setScenario(newScenario(include3BetPots, includeMultiway, streetFocus))
    setAnswer(null)
    setShowRange(false)
  }

  useHotkeys({
    c: () => pick('call'),
    f: () => pick('fold'),
    enter: () => answer !== null && next(),
    ' ': () => answer !== null && next(),
  })

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

      <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-4 flex flex-col items-center gap-2 text-center">
        <div className="text-slate-400 text-xs">
          {STACK_DEPTH_LABELS[scenario.depth]} effective · {POT_TYPE_LABELS[scenario.potType]}
        </div>
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
      </div>

      <p className="text-slate-300 text-center max-w-sm">
        {scenarioPrompt(scenario.potType, scenario.context, scenario.board.length)}
      </p>

      {answer === null && (
        <HintBox>
          You need {(analysis.required * 100).toFixed(1)}% equity to call profitably here
          (bet / (pot + bet)). Compare that to how far ahead your hand is — call only if
          your real equity beats it. {DEPTH_HINTS[scenario.depth]}
        </HintBox>
      )}

      {answer === null ? (
        <div className="flex gap-4">
          <button
            onClick={() => pick('call')}
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Call <span className="text-emerald-200 text-xs font-normal">(C)</span>
          </button>
          <button
            onClick={() => pick('fold')}
            className="px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Fold <span className="text-rose-200 text-xs font-normal">(F)</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div
            className={[
              'px-4 py-2 rounded-lg font-semibold',
              answer === analysis.correctAnswer
                ? 'bg-emerald-600/20 text-emerald-400'
                : 'bg-rose-600/20 text-rose-400',
            ].join(' ')}
          >
            {answer === analysis.correctAnswer
              ? 'Correct!'
              : `Not quite — correct answer is ${analysis.correctAnswer.toUpperCase()}`}
          </div>
          <div className="text-sm text-slate-400 text-center max-w-sm">
            Your hand: {analysis.categoryName}
            <br />
            Estimated equity vs.{' '}
            {scenario.potType === 'multiway'
              ? `both opponents' ${analysis.tier}-consistent ranges`
              : `villain's ${analysis.tier}-consistent range`}
            {scenario.potType === 'threeBet' ? ' (3-bet pot)' : ''}:{' '}
            {(analysis.equity * 100).toFixed(1)}% (required: {(analysis.required * 100).toFixed(1)}%)
            <br />
            EV of calling: ${analysis.ev.toFixed(2)}
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
                  <span className="inline-block w-3 h-3 rounded-sm bg-rose-600/80" /> Bets this size
                  (equity computed against this)
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-slate-600/70" /> Possible preflop, wouldn't bet this size
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
        Villain's range starts from their real preflop range for this exact
        line (the same data the Preflop Ranges / Facing a Raise drills use),
        then narrows to whichever of those hands would actually bet this
        size on this board (wider for small bets, tighter/stronger for big
        bets) — history and bet size together, not either alone. Postflop
        decisions need postflop play to exist, so this drill only offers
        100bb/40bb, not 20bb push/fold depth.
      </p>
    </div>
  )
}
