import { useMemo, useState } from 'react'
import type { Card } from '../lib/cards'
import { cardLabel, makeDeck, shuffle } from '../lib/cards'
import { estimateEquityVsRange, evOfCall, potOdds } from '../lib/equity'
import { CATEGORY_NAMES, evaluateBest } from '../lib/evaluator'
import { VILLAIN_RANGES, villainRangeForBet } from '../data/villainRanges'
import { STACK_DEPTHS, STACK_DEPTH_LABELS, type StackDepth } from '../data/stackDepthRanges'
import { useHotkeys } from '../lib/useHotkeys'
import { recordAttempt } from '../lib/progressStore'
import { CardChip } from '../components/CardChip'
import { HintBox } from '../components/HintBox'

interface Scenario {
  hero: [Card, Card]
  board: Card[]
  pot: number
  bet: number
  depth: StackDepth
}

// Shallower effective stacks mean less money has gone into (and can still go
// into) the pot, so pot size scales down with depth. Bet-to-pot ratio stays
// the same distribution regardless of depth, since that's what drives
// villain's range tier.
const POT_RANGE: Record<StackDepth, [number, number]> = {
  deep: [30, 250],
  medium: [15, 110],
  short: [8, 55],
}

const DEPTH_HINTS: Record<StackDepth, string> = {
  deep: "At 100bb effective, a drawing hand can win extra money on later streets if it hits — real implied odds can make a call correct even a bit below the raw equity-vs-pot-odds comparison.",
  medium: "At 40bb, there's less behind to win on future streets, so implied odds add less cushion — lean closer to the raw equity comparison.",
  short: "At 20bb effective, this is often close to your whole stack — there's barely any play left behind, so implied odds don't really apply. The raw equity comparison is the whole story.",
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDepth(): StackDepth {
  return STACK_DEPTHS[Math.floor(Math.random() * STACK_DEPTHS.length)]
}

function newScenario(): Scenario {
  const deck = shuffle(makeDeck())
  const hero: [Card, Card] = [deck[0], deck[1]]
  const boardSize = [3, 4, 5][randomInt(0, 2)]
  const board = deck.slice(2, 2 + boardSize)
  const depth = randomDepth()
  const [potMin, potMax] = POT_RANGE[depth]
  const pot = randomInt(potMin, potMax)
  const bet = Math.round(pot * (randomInt(30, 110) / 100))
  return { hero, board, pot, bet, depth }
}

export function PostflopTrainer() {
  const [scenario, setScenario] = useState<Scenario>(() => newScenario())
  const [answer, setAnswer] = useState<'call' | 'fold' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  // Only run the (moderately expensive) Monte Carlo once per scenario.
  const analysis = useMemo(() => {
    const tier = villainRangeForBet(scenario.bet, scenario.pot)
    const equityResult = estimateEquityVsRange(
      scenario.hero,
      scenario.board,
      VILLAIN_RANGES[tier],
      800,
    )
    const required = potOdds(scenario.bet, scenario.pot)
    const ev = evOfCall(equityResult.equity, scenario.pot, scenario.bet)
    const category = evaluateBest([...scenario.hero, ...scenario.board])
    return {
      equity: equityResult.equity,
      required,
      ev,
      tier,
      correctAnswer: (equityResult.equity > required ? 'call' : 'fold') as 'call' | 'fold',
      categoryName: CATEGORY_NAMES[category.category],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

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
      detail: `${analysis.categoryName} on ${boardStr} vs ${analysis.tier} range, ${STACK_DEPTH_LABELS[scenario.depth]} — you: ${choice}, correct: ${analysis.correctAnswer}`,
    })
  }

  function next() {
    setScenario(newScenario())
    setAnswer(null)
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
        <div className="text-slate-400 text-xs">{STACK_DEPTH_LABELS[scenario.depth]} effective</div>
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
        Villain bets, everyone else folds to you. Call or fold?
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
            Estimated equity vs. villain's {analysis.tier} betting range:{' '}
            {(analysis.equity * 100).toFixed(1)}% (required: {(analysis.required * 100).toFixed(1)}%)
            <br />
            EV of calling: ${analysis.ev.toFixed(2)}
          </div>
          <button
            onClick={next}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Next scenario <span className="text-indigo-200 text-xs font-normal">(Enter)</span>
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500 max-w-md text-center">
        Equity is estimated via simulation against an approximate villain
        range (wider for small bets, tighter/stronger for big bets) rather
        than a specific read — still a simplification, but closer to a real
        decision than assuming any two cards. Pot size scales down with
        shallower effective stacks; the equity-vs-pot-odds math doesn't
        depend on depth, but how much you should trust implied odds beyond
        it does.
      </p>
    </div>
  )
}
