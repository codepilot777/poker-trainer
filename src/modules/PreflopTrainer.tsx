import { useState } from 'react'
import { POSITIONS, POSITION_NAMES, type Position } from '../data/preflopRanges'
import {
  STACK_DEPTHS,
  STACK_DEPTH_LABELS,
  STACK_DEPTH_ACTION_LABEL,
  STACK_DEPTH_RANGES,
  isInDepthRange,
  type StackDepth,
} from '../data/stackDepthRanges'
import { randomHandLabelWeighted } from '../lib/handGrid'
import { RangeGrid } from '../components/RangeGrid'
import { useHotkeys } from '../lib/useHotkeys'
import { recordAttempt } from '../lib/progressStore'
import { HintBox } from '../components/HintBox'

const POSITION_HINTS: Record<Position, string> = {
  UTG: 'Earliest position — 5 players could still act behind you, so play the tightest range.',
  MP: 'Slightly later than UTG — you can open a bit wider.',
  CO: 'One seat before the button — only 2 players left to act, open noticeably wider.',
  BTN: 'Best seat at the table — you act last every postflop street, so this is the widest range.',
  SB: "You'll be out of position postflop against everyone except the BB — wide, but not as wide as BTN.",
}

const DEPTH_HINTS: Partial<Record<StackDepth, string>> = {
  short: 'At 20bb postflop play barely exists — favor a wide shove over a standard open.',
  medium: 'At 40bb, drop the most speculative small suited/connector hands — implied odds shrink.',
}

function randomPosition(): Position {
  return POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
}

function randomDepth(): StackDepth {
  return STACK_DEPTHS[Math.floor(Math.random() * STACK_DEPTHS.length)]
}

interface Round {
  position: Position
  hand: string
  depth: StackDepth
}

function newRound(): Round {
  return { position: randomPosition(), hand: randomHandLabelWeighted(), depth: randomDepth() }
}

export function PreflopTrainer() {
  const [round, setRound] = useState<Round>(() => newRound())
  const [answer, setAnswer] = useState<'open' | 'fold' | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showChart, setShowChart] = useState(false)

  const openLabel = STACK_DEPTH_ACTION_LABEL[round.depth]
  const correctAnswer = isInDepthRange(round.depth, round.position, round.hand) ? 'open' : 'fold'
  const correctLabel = correctAnswer === 'open' ? openLabel : 'Fold'
  const isCorrect = answer !== null && answer === correctAnswer

  function pick(choice: 'open' | 'fold') {
    if (answer !== null) return
    const wasCorrect = choice === correctAnswer
    setAnswer(choice)
    setScore((s) => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    const choiceLabel = choice === 'open' ? openLabel : 'Fold'
    recordAttempt({
      module: 'preflop',
      moduleLabel: 'Preflop Ranges',
      correct: wasCorrect,
      group: round.position,
      detail: `${round.hand} at ${round.position}, ${STACK_DEPTH_LABELS[round.depth]} — you: ${choiceLabel}, correct: ${correctLabel}`,
    })
  }

  function next() {
    setRound(newRound())
    setAnswer(null)
  }

  useHotkeys({
    r: () => pick('open'),
    f: () => pick('fold'),
    enter: () => answer !== null && next(),
    ' ': () => answer !== null && next(),
  })

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-400 text-sm text-center max-w-sm">
        You're first to act, everyone else folds to you, at {STACK_DEPTH_LABELS[round.depth]}.
        Should you {openLabel.toLowerCase()} or fold?
      </div>

      <div className="text-slate-300">
        Score: <span className="text-white font-semibold">{score.correct}</span> /{' '}
        {score.total}
        {score.total > 0 && (
          <span className="text-slate-500"> ({Math.round((score.correct / score.total) * 100)}%)</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="text-lg text-slate-400">
          {POSITION_NAMES[round.position]} · {STACK_DEPTH_LABELS[round.depth]}
        </div>
        <div
          key={round.hand + round.position + round.depth}
          className="animate-pop-in text-6xl font-bold tracking-wide bg-slate-800 rounded-xl px-10 py-6 border border-slate-700"
        >
          {round.hand}
        </div>
      </div>

      {answer === null && (
        <HintBox>
          {POSITION_HINTS[round.position]}
          {DEPTH_HINTS[round.depth] ? ` ${DEPTH_HINTS[round.depth]}` : ''}
        </HintBox>
      )}

      {answer === null ? (
        <div className="flex gap-4">
          <button
            onClick={() => pick('open')}
            className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform font-semibold text-white"
          >
            {openLabel} <span className="text-emerald-200 text-xs font-normal">(R)</span>
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
            {isCorrect ? 'Correct!' : `Not quite — correct answer is ${correctLabel.toUpperCase()}`}
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
        {showChart ? 'Hide' : 'Show'} {POSITION_NAMES[round.position]} · {STACK_DEPTH_LABELS[round.depth]} chart
      </button>

      {showChart && (
        <div className="w-full max-w-xl animate-fade-in">
          <RangeGrid inRange={STACK_DEPTH_RANGES[round.depth][round.position]} highlight={round.hand} />
        </div>
      )}

      <p className="text-xs text-slate-500 max-w-md text-center">
        Ranges shown are simplified 6-max approximations for practicing
        recognition — not a solved GTO output. At 20bb, "open" becomes a
        shove: postflop play barely exists, so ranges widen from fold equity
        rather than tighten. At 40bb, the most speculative hands (small
        suited connectors, weak suited aces) lose value as implied odds
        shrink, so ranges tighten from the 100bb baseline.
      </p>
    </div>
  )
}
