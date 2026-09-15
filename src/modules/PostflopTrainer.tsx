import { useMemo, useState } from 'react'
import type { Card } from '../lib/cards'
import { cardLabel, makeDeck, shuffle } from '../lib/cards'
import { estimateEquityVsRandom, evOfCall, potOdds } from '../lib/equity'
import { CATEGORY_NAMES, evaluateBest } from '../lib/evaluator'

interface Scenario {
  hero: [Card, Card]
  board: Card[]
  pot: number
  bet: number
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
  const bet = Math.round(pot * (randomInt(30, 110) / 100))
  return { hero, board, pot, bet }
}

function suitColor(suit: number): string {
  // 0=s,1=h,2=d,3=c
  if (suit === 0) return 'text-slate-100'
  if (suit === 1) return 'text-rose-400'
  if (suit === 2) return 'text-sky-400'
  return 'text-emerald-400'
}

function CardChip({ card }: { card: Card }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-12 h-16 rounded-md bg-slate-900 border border-slate-700 font-bold text-lg ${suitColor(card.suit)}`}
    >
      {cardLabel(card).toUpperCase()}
    </span>
  )
}

export function PostflopTrainer() {
  const [scenario, setScenario] = useState<Scenario>(() => newScenario())
  const [answer, setAnswer] = useState<'call' | 'fold' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })

  // Only run the (moderately expensive) Monte Carlo once per scenario.
  const analysis = useMemo(() => {
    const equityResult = estimateEquityVsRandom(scenario.hero, scenario.board, 800)
    const required = potOdds(scenario.bet, scenario.pot)
    const ev = evOfCall(equityResult.equity, scenario.pot, scenario.bet)
    const category = evaluateBest([...scenario.hero, ...scenario.board])
    return {
      equity: equityResult.equity,
      required,
      ev,
      correctAnswer: (equityResult.equity > required ? 'call' : 'fold') as 'call' | 'fold',
      categoryName: CATEGORY_NAMES[category.category],
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

  function pick(choice: 'call' | 'fold') {
    if (answer !== null) return
    setAnswer(choice)
    setScore((s) => ({
      correct: s.correct + (choice === analysis.correctAnswer ? 1 : 0),
      total: s.total + 1,
    }))
  }

  function next() {
    setScenario(newScenario())
    setAnswer(null)
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-300">
        Score: <span className="text-white font-semibold">{score.correct}</span> / {score.total}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-sm text-slate-400">Board</div>
        <div className="flex gap-2">
          {scenario.board.map((c) => (
            <CardChip key={cardLabel(c)} card={c} />
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-sm text-slate-400">Your hand</div>
        <div className="flex gap-2">
          {scenario.hero.map((c) => (
            <CardChip key={cardLabel(c)} card={c} />
          ))}
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-4 flex gap-8 text-center">
        <div>
          <div className="text-slate-400 text-xs">Pot</div>
          <div className="text-xl font-bold">${scenario.pot}</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Villain bets</div>
          <div className="text-xl font-bold">${scenario.bet}</div>
        </div>
      </div>

      <p className="text-slate-300 text-center max-w-sm">
        Villain bets, everyone else folds to you. Call or fold?
      </p>

      {answer === null ? (
        <div className="flex gap-4">
          <button
            onClick={() => pick('call')}
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
          >
            Call
          </button>
          <button
            onClick={() => pick('fold')}
            className="px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 font-semibold text-white"
          >
            Fold
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
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
            Estimated equity vs. a random hand: {(analysis.equity * 100).toFixed(1)}% (required:{' '}
            {(analysis.required * 100).toFixed(1)}%)
            <br />
            EV of calling: ${analysis.ev.toFixed(2)}
          </div>
          <button
            onClick={next}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
          >
            Next scenario
          </button>
        </div>
      )}

      <p className="text-xs text-slate-500 max-w-md text-center">
        Equity is estimated via simulation against a uniformly random villain
        hand — a simplification for training the pot-odds-vs-equity decision,
        not a real opponent range.
      </p>
    </div>
  )
}
