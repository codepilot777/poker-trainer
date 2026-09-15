import { useState } from 'react'
import { POSITION_NAMES, type Position } from '../data/preflopRanges'
import { correctVsOpenAction, tierForOpenerPosition, type Vs3BetAction } from '../data/vsOpenRanges'
import { randomHandLabelWeighted } from '../lib/handGrid'
import { RangeGrid } from '../components/RangeGrid'

const ACTION_LABEL: Record<Vs3BetAction, string> = {
  fold: 'Fold',
  call: 'Call',
  threeBet: '3-Bet',
}

// Opener must have an earlier-acting position than hero.
const OPENER_POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB']

function randomOpenerPosition(): Position {
  return OPENER_POSITIONS[Math.floor(Math.random() * OPENER_POSITIONS.length)]
}

interface Round {
  opener: Position
  hand: string
}

function newRound(): Round {
  return { opener: randomOpenerPosition(), hand: randomHandLabelWeighted() }
}

export function FacingRaiseTrainer() {
  const [round, setRound] = useState<Round>(() => newRound())
  const [answer, setAnswer] = useState<Vs3BetAction | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showChart, setShowChart] = useState(false)

  const tier = tierForOpenerPosition(round.opener)
  const correctAnswer = correctVsOpenAction(tier, round.hand)
  const isCorrect = answer !== null && answer === correctAnswer

  function pick(choice: Vs3BetAction) {
    if (answer !== null) return
    setAnswer(choice)
    setScore((s) => ({
      correct: s.correct + (choice === correctAnswer ? 1 : 0),
      total: s.total + 1,
    }))
  }

  function next() {
    setRound(newRound())
    setAnswer(null)
  }

  function chartClass(label: string): string {
    const action = correctVsOpenAction(tier, label)
    if (action === 'threeBet') return 'bg-rose-600/80 text-white'
    if (action === 'call') return 'bg-emerald-600/80 text-white'
    return 'bg-slate-800 text-slate-500'
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-400 text-sm text-center max-w-sm">
        {POSITION_NAMES[round.opener]} opens, action folds to you. Fold, call, or 3-bet?
      </div>

      <div className="text-slate-300">
        Score: <span className="text-white font-semibold">{score.correct}</span> /{' '}
        {score.total}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-lg text-slate-400">vs. {POSITION_NAMES[round.opener]} open</div>
        <div className="text-6xl font-bold tracking-wide bg-slate-800 rounded-xl px-10 py-6 border border-slate-700">
          {round.hand}
        </div>
      </div>

      {answer === null ? (
        <div className="flex gap-4">
          <button
            onClick={() => pick('fold')}
            className="px-5 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 font-semibold text-white"
          >
            Fold
          </button>
          <button
            onClick={() => pick('call')}
            className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white"
          >
            Call
          </button>
          <button
            onClick={() => pick('threeBet')}
            className="px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-semibold text-white"
          >
            3-Bet
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div
            className={[
              'px-4 py-2 rounded-lg font-semibold',
              isCorrect ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400',
            ].join(' ')}
          >
            {isCorrect
              ? 'Correct!'
              : `Not quite — correct answer is ${ACTION_LABEL[correctAnswer]}`}
          </div>
          <button
            onClick={next}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-white"
          >
            Next hand
          </button>
        </div>
      )}

      <button
        onClick={() => setShowChart((v) => !v)}
        className="text-sm text-slate-400 underline hover:text-slate-200"
      >
        {showChart ? 'Hide' : 'Show'} vs. {POSITION_NAMES[round.opener]} response chart
      </button>

      {showChart && (
        <div className="w-full max-w-xl flex flex-col items-center gap-2">
          <RangeGrid cellClass={chartClass} highlight={round.hand} />
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-600/80" /> 3-Bet
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600/80" /> Call
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-800 border border-slate-600" />{' '}
              Fold
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 max-w-md text-center">
        Response ranges are grouped into three tiers by opener position (UTG/MP,
        CO, BTN/SB) rather than every exact matchup, and don't account for
        hero's own position or stack depth — simplified for practicing the
        fold/call/3-bet decision, not a solved GTO output.
      </p>
    </div>
  )
}
