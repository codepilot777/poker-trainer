import { useState } from 'react'
import { POSITION_NAMES, type Position } from '../data/preflopRanges'
import {
  correctVsOpenAction,
  tierForOpenerPosition,
  RESPONSE_DEPTHS,
  RESPONSE_DEPTH_LABELS,
  RESPONSE_AGGRO_LABEL,
  type Vs3BetAction,
  type ResponseDepth,
  type VsOpenTier,
} from '../data/vsOpenRanges'
import { randomHandLabelWeighted } from '../lib/handGrid'
import { RangeGrid } from '../components/RangeGrid'
import { useHotkeys } from '../lib/useHotkeys'
import { recordAttempt } from '../lib/progressStore'
import { HintBox } from '../components/HintBox'

const TIER_HINTS: Record<VsOpenTier, string> = {
  vsEarly: "An early-position opener has a tight, strong range — you need a genuine hand to continue.",
  vsCutoff: 'A CO open is moderately wide — you can defend a bit looser than vs. an early open.',
  vsLate: "A BTN/SB open can be very wide — you can continue with more hands, including some 3-bet bluffs.",
}

const DEPTH_HINTS: Partial<Record<ResponseDepth, string>> = {
  short: "At 20bb it's mostly shove-or-fold — a flat call rarely makes sense with so little play left.",
  medium: 'At 40bb, tighten the calling range — speculative hands lose value as implied odds shrink.',
}

// Opener must have an earlier-acting position than hero.
const OPENER_POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB']

function randomOpenerPosition(): Position {
  return OPENER_POSITIONS[Math.floor(Math.random() * OPENER_POSITIONS.length)]
}

function randomDepth(): ResponseDepth {
  return RESPONSE_DEPTHS[Math.floor(Math.random() * RESPONSE_DEPTHS.length)]
}

interface Round {
  opener: Position
  hand: string
  depth: ResponseDepth
}

function newRound(): Round {
  return { opener: randomOpenerPosition(), hand: randomHandLabelWeighted(), depth: randomDepth() }
}

export function FacingRaiseTrainer() {
  const [round, setRound] = useState<Round>(() => newRound())
  const [answer, setAnswer] = useState<Vs3BetAction | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showChart, setShowChart] = useState(false)

  const aggroLabel = RESPONSE_AGGRO_LABEL[round.depth]
  const actionLabel = (a: Vs3BetAction) =>
    a === 'threeBet' ? aggroLabel : a === 'call' ? 'Call' : 'Fold'

  const tier = tierForOpenerPosition(round.opener)
  const correctAnswer = correctVsOpenAction(round.depth, tier, round.hand)
  const isCorrect = answer !== null && answer === correctAnswer

  function pick(choice: Vs3BetAction) {
    if (answer !== null) return
    const wasCorrect = choice === correctAnswer
    setAnswer(choice)
    setScore((s) => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    recordAttempt({
      module: 'facingraise',
      moduleLabel: 'Facing a Raise',
      correct: wasCorrect,
      group: round.opener,
      detail: `${round.hand} vs ${round.opener} open, ${RESPONSE_DEPTH_LABELS[round.depth]} — you: ${actionLabel(choice)}, correct: ${actionLabel(correctAnswer)}`,
    })
  }

  function next() {
    setRound(newRound())
    setAnswer(null)
  }

  useHotkeys({
    f: () => pick('fold'),
    c: () => pick('call'),
    r: () => pick('threeBet'),
    enter: () => answer !== null && next(),
    ' ': () => answer !== null && next(),
  })

  function chartClass(label: string): string {
    const action = correctVsOpenAction(round.depth, tier, label)
    if (action === 'threeBet') return 'bg-rose-600/80 text-white'
    if (action === 'call') return 'bg-emerald-600/80 text-white'
    return 'bg-slate-800 text-slate-500'
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-400 text-sm text-center max-w-sm">
        {POSITION_NAMES[round.opener]} opens, action folds to you, at{' '}
        {RESPONSE_DEPTH_LABELS[round.depth]}. Fold, call, or {aggroLabel.toLowerCase()}?
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
          vs. {POSITION_NAMES[round.opener]} open · {RESPONSE_DEPTH_LABELS[round.depth]}
        </div>
        <div
          key={round.hand + round.opener + round.depth}
          className="animate-pop-in text-6xl font-bold tracking-wide bg-slate-800 rounded-xl px-10 py-6 border border-slate-700"
        >
          {round.hand}
        </div>
      </div>

      {answer === null && (
        <HintBox>
          {TIER_HINTS[tier]}
          {DEPTH_HINTS[round.depth] ? ` ${DEPTH_HINTS[round.depth]}` : ''}
        </HintBox>
      )}

      {answer === null ? (
        <div className="flex gap-4">
          <button
            onClick={() => pick('fold')}
            className="px-5 py-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Fold <span className="text-rose-200 text-xs font-normal">(F)</span>
          </button>
          <button
            onClick={() => pick('call')}
            className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition-transform font-semibold text-white"
          >
            Call <span className="text-emerald-200 text-xs font-normal">(C)</span>
          </button>
          <button
            onClick={() => pick('threeBet')}
            className="px-5 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:scale-95 transition-transform font-semibold text-white"
          >
            {aggroLabel} <span className="text-amber-100 text-xs font-normal">(R)</span>
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
            {isCorrect
              ? 'Correct!'
              : `Not quite — correct answer is ${actionLabel(correctAnswer)}`}
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
        {showChart ? 'Hide' : 'Show'} vs. {POSITION_NAMES[round.opener]} · {RESPONSE_DEPTH_LABELS[round.depth]} chart
      </button>

      {showChart && (
        <div className="w-full max-w-xl flex flex-col items-center gap-2 animate-fade-in">
          <RangeGrid cellClass={chartClass} highlight={round.hand} />
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-600/80" /> {aggroLabel}
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
        CO, BTN/SB) and by stack depth, rather than every exact matchup —
        simplified for practicing the fold/call/{aggroLabel.toLowerCase()}{' '}
        decision, not a solved GTO output. At 20bb, calling barely exists —
        it's mostly shove or fold.
      </p>
    </div>
  )
}
