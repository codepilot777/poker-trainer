import { useState } from 'react'
import { POSITIONS, POSITION_NAMES, isInOpenRange, type Position } from '../data/preflopRanges'
import { PREFLOP_OPEN_RANGES } from '../data/preflopRanges'
import { randomHandLabelWeighted } from '../lib/handGrid'
import { RangeGrid } from '../components/RangeGrid'
import { useHotkeys } from '../lib/useHotkeys'
import { recordAttempt } from '../lib/progressStore'

function randomPosition(): Position {
  return POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
}

interface Round {
  position: Position
  hand: string
}

function newRound(): Round {
  return { position: randomPosition(), hand: randomHandLabelWeighted() }
}

export function PreflopTrainer() {
  const [round, setRound] = useState<Round>(() => newRound())
  const [answer, setAnswer] = useState<'raise' | 'fold' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showChart, setShowChart] = useState(false)

  const correctAnswer = isInOpenRange(round.position, round.hand) ? 'raise' : 'fold'
  const isCorrect = answer !== null && answer === correctAnswer

  function pick(choice: 'raise' | 'fold') {
    if (answer !== null) return
    const wasCorrect = choice === correctAnswer
    setAnswer(choice)
    setScore((s) => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    recordAttempt({
      module: 'preflop',
      moduleLabel: 'Preflop Ranges',
      correct: wasCorrect,
      group: round.position,
      detail: `${round.hand} at ${round.position} — you: ${choice}, correct: ${correctAnswer}`,
    })
  }

  function next() {
    setRound(newRound())
    setAnswer(null)
  }

  useHotkeys({
    r: () => pick('raise'),
    f: () => pick('fold'),
    enter: () => answer !== null && next(),
    ' ': () => answer !== null && next(),
  })

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-400 text-sm">
        You're first to act, everyone else folds to you. Should you open-raise or fold?
      </div>

      <div className="text-slate-300">
        Score: <span className="text-white font-semibold">{score.correct}</span> /{' '}
        {score.total}
        {score.total > 0 && (
          <span className="text-slate-500"> ({Math.round((score.correct / score.total) * 100)}%)</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-lg text-slate-400">{POSITION_NAMES[round.position]}</div>
        <div
          key={round.hand + round.position}
          className="animate-pop-in text-6xl font-bold tracking-wide bg-slate-800 rounded-xl px-10 py-6 border border-slate-700"
        >
          {round.hand}
        </div>
      </div>

      {answer === null ? (
        <div className="flex gap-4">
          <button
            onClick={() => pick('raise')}
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Raise <span className="text-emerald-200 text-xs font-normal">(R)</span>
          </button>
          <button
            onClick={() => pick('fold')}
            className="px-6 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Fold <span className="text-rose-200 text-xs font-normal">(F)</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div
            className={[
              'px-4 py-2 rounded-lg font-semibold',
              isCorrect ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400',
            ].join(' ')}
          >
            {isCorrect ? 'Correct!' : `Not quite — correct answer is ${correctAnswer.toUpperCase()}`}
          </div>
          <button
            onClick={next}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Next hand <span className="text-indigo-200 text-xs font-normal">(Enter)</span>
          </button>
        </div>
      )}

      <button
        onClick={() => setShowChart((v) => !v)}
        className="text-sm text-slate-400 underline hover:text-slate-200"
      >
        {showChart ? 'Hide' : 'Show'} {POSITION_NAMES[round.position]} range chart
      </button>

      {showChart && (
        <div className="w-full max-w-xl animate-fade-in">
          <RangeGrid inRange={PREFLOP_OPEN_RANGES[round.position]} highlight={round.hand} />
        </div>
      )}

      <p className="text-xs text-slate-500 max-w-md text-center">
        Ranges shown are simplified 6-max first-in open-raise approximations for
        practicing recognition — not a solved GTO output.
      </p>
    </div>
  )
}
