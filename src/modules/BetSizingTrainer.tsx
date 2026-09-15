import { useMemo, useState } from 'react'
import type { Card } from '../lib/cards'
import { cardLabel, makeDeck, shuffle } from '../lib/cards'
import { estimateEquityVsRange } from '../lib/equity'
import { CATEGORY_NAMES, evaluateBest } from '../lib/evaluator'
import { VILLAIN_RANGES } from '../data/villainRanges'
import { useHotkeys } from '../lib/useHotkeys'
import { recordAttempt } from '../lib/progressStore'
import { CardChip } from '../components/CardChip'
import { HintBox } from '../components/HintBox'

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

interface Scenario {
  hero: [Card, Card]
  board: Card[]
  pot: number
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function newScenario(): Scenario {
  const deck = shuffle(makeDeck())
  const hero: [Card, Card] = [deck[0], deck[1]]
  const boardSize = [3, 4, 5][randomInt(0, 2)]
  const board = deck.slice(2, 2 + boardSize)
  const pot = randomInt(30, 250)
  return { hero, board, pot }
}

function actionForEquity(equity: number): SizingAction {
  if (equity >= 0.65) return 'betBig'
  if (equity >= 0.45) return 'betSmall'
  return 'check'
}

export function BetSizingTrainer() {
  const [scenario, setScenario] = useState<Scenario>(() => newScenario())
  const [answer, setAnswer] = useState<SizingAction | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  // Villain is assumed to have a plausible medium continuing range — only
  // used here to estimate hero's raw equity edge, not to model a real read.
  const analysis = useMemo(() => {
    const equityResult = estimateEquityVsRange(
      scenario.hero,
      scenario.board,
      VILLAIN_RANGES.medium,
      800,
    )
    const category = evaluateBest([...scenario.hero, ...scenario.board])
    return {
      equity: equityResult.equity,
      correctAnswer: actionForEquity(equityResult.equity),
      categoryName: CATEGORY_NAMES[category.category],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

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
      detail: `${analysis.categoryName} on ${boardStr} — you: ${ACTION_LABEL[choice]}, correct: ${ACTION_LABEL[analysis.correctAnswer]}`,
    })
  }

  function next() {
    setScenario(newScenario())
    setAnswer(null)
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
        You're first to act, no bet in front of you. Check, bet small, or bet big?
      </div>

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

      <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-4 text-center">
        <div className="text-slate-400 text-xs">Pot</div>
        <div className="text-xl font-bold">${scenario.pot}</div>
      </div>

      {answer === null && (
        <HintBox>
          Bet size should track your equity edge: a big edge → bet big for value, a
          thin edge → bet small to keep worse hands in, no edge → check instead.
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
            Estimated equity vs. villain's continuing range: {(analysis.equity * 100).toFixed(1)}%
            <br />
            {RATIONALE[analysis.correctAnswer]}
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
        A simplified equity-bucket heuristic (≥65% equity → bet big, ≥45% →
        bet small, else check) against an approximate opponent range — not a
        solved sizing strategy, which also weighs blockers, board texture,
        and bluff-to-value ratios.
      </p>
    </div>
  )
}
