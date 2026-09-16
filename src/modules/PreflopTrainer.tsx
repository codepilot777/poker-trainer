import { useState } from 'react'
import { POSITIONS, POSITION_NAMES, type Position } from '../data/preflopRanges'
import {
  STACK_DEPTHS,
  STACK_DEPTH_LABELS,
  STACK_DEPTH_ACTION_LABEL,
  STACK_DEPTH_RANGES,
  isInDepthRange,
  isAcceptableOpenAction,
  isMixedOpenHand,
  type StackDepth,
} from '../data/stackDepthRanges'
import {
  correctVsOpenAction,
  isAcceptableVsOpenAction,
  isMixedCallHand,
  RESPONSE_AGGRO_LABEL,
  type Vs3BetAction,
} from '../data/vsOpenRanges'
import { randomHandLabelWeighted } from '../lib/handGrid'
import { RangeGrid } from '../components/RangeGrid'
import { useHotkeys } from '../lib/useHotkeys'
import { recordAttempt } from '../lib/progressStore'
import { useTeachingMode } from '../lib/settings'
import { HintBox } from '../components/HintBox'

type Kind = 'firstIn' | 'facingOpen'
type Action = 'open' | 'fold' | 'call' | 'threeBet'

const POSITION_HINTS: Record<Position, string> = {
  UTG: 'Earliest position — 5 players could still act behind you, so play the tightest range.',
  MP: 'Slightly later than UTG — you can open a bit wider.',
  CO: 'One seat before the button — only 2 players left to act, open noticeably wider.',
  BTN: 'Best seat at the table — you act last every postflop street, so this is the widest range.',
  SB: "You'll be out of position postflop against everyone except the BB — wide, but not as wide as BTN.",
}

const OPENER_HINTS: Record<Position, string> = {
  UTG: 'UTG opens with the tightest range at the table — you need a genuine hand to continue.',
  MP: 'MP opens a little wider than UTG — you can continue with slightly more.',
  CO: 'A CO open is moderately wide — you can defend a bit looser than vs. an early open.',
  BTN: 'A BTN open can be very wide — you can continue with more hands, including some 3-bet bluffs.',
  SB: "SB opens tighter than BTN despite being later — SB is out of position for the rest of the hand, so continue a bit tighter than vs. BTN.",
}

const OPEN_DEPTH_HINTS: Partial<Record<StackDepth, string>> = {
  short: 'At 20bb postflop play barely exists — favor a wide shove over a standard open.',
  medium: 'At 40bb, drop the most speculative small suited/connector hands — implied odds shrink.',
}

const RESPONSE_DEPTH_HINTS: Partial<Record<StackDepth, string>> = {
  short: "At 20bb, villain has already effectively shoved and you're the same depth — calling and shoving over put in the same chips, so either button is correct here. The only real decision is continue or fold.",
  medium: 'At 40bb, tighten the calling range — speculative hands lose value as implied odds shrink.',
}

// Opener must have an earlier-acting position than hero for a facing-open round.
const OPENER_POSITIONS: Position[] = ['UTG', 'MP', 'CO', 'BTN', 'SB']

function randomPosition(): Position {
  return POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
}

function randomDepth(): StackDepth {
  return STACK_DEPTHS[Math.floor(Math.random() * STACK_DEPTHS.length)]
}

interface Round {
  kind: Kind
  /** Hero's position for firstIn; the responder's implied seat isn't tracked for facingOpen. */
  position: Position
  hand: string
  depth: StackDepth
}

function newRound(): Round {
  const kind: Kind = Math.random() < 0.5 ? 'firstIn' : 'facingOpen'
  const position = kind === 'firstIn' ? randomPosition() : OPENER_POSITIONS[Math.floor(Math.random() * OPENER_POSITIONS.length)]
  return { kind, position, hand: randomHandLabelWeighted(), depth: randomDepth() }
}

function villainOpenRangeClass(depth: StackDepth, position: Position): (label: string) => string {
  return (label: string) =>
    STACK_DEPTH_RANGES[depth][position].has(label) ? 'bg-rose-600/80 text-white' : 'bg-slate-800 text-slate-500'
}

export function PreflopTrainer() {
  const { teachingMode } = useTeachingMode()
  const [round, setRound] = useState<Round>(() => newRound())
  const [answer, setAnswer] = useState<Action | null>(null)
  const [score, setScore] = useState({ correct: 0, total: 0 })
  const [showChart, setShowChart] = useState(false)

  const openLabel = STACK_DEPTH_ACTION_LABEL[round.depth]
  const aggroLabel = RESPONSE_AGGRO_LABEL[round.depth]
  const actionLabel = (a: Action): string =>
    a === 'open' ? openLabel : a === 'threeBet' ? aggroLabel : a === 'call' ? 'Call' : 'Fold'

  const correctAnswer: Action =
    round.kind === 'firstIn'
      ? isInDepthRange(round.depth, round.position, round.hand)
        ? 'open'
        : 'fold'
      : (correctVsOpenAction(round.depth, round.position, round.hand) as Action)

  const isMixed =
    round.kind === 'firstIn'
      ? isMixedOpenHand(round.depth, round.position, round.hand)
      : isMixedCallHand(round.depth, round.position, round.hand)

  const isCorrect =
    answer !== null &&
    (round.kind === 'firstIn'
      ? isAcceptableOpenAction(round.depth, round.position, round.hand, answer as 'open' | 'fold')
      : isAcceptableVsOpenAction(round.depth, round.position, round.hand, answer as Vs3BetAction))

  // At 20bb facing an open, call/threeBet are the same chip-EV action — show
  // both. At 100bb/40bb, a small hand-picked set of boundary hands mix
  // between two actions instead of having one pure answer — show both too.
  const correctAnswerLabel =
    round.kind === 'facingOpen' && round.depth === 'short' && correctAnswer !== 'fold'
      ? `Call or ${aggroLabel}`
      : isMixed
        ? round.kind === 'firstIn'
          ? `Mixed — ${openLabel} or Fold`
          : 'Mixed — Call or Fold'
        : actionLabel(correctAnswer)

  function pick(choice: Action) {
    if (answer !== null) return
    const wasCorrect =
      round.kind === 'firstIn'
        ? isAcceptableOpenAction(round.depth, round.position, round.hand, choice as 'open' | 'fold')
        : isAcceptableVsOpenAction(round.depth, round.position, round.hand, choice as Vs3BetAction)
    setAnswer(choice)
    setScore((s) => ({
      correct: s.correct + (wasCorrect ? 1 : 0),
      total: s.total + 1,
    }))
    if (round.kind === 'firstIn') {
      recordAttempt({
        module: 'preflop',
        moduleLabel: 'Preflop: Open/Fold',
        correct: wasCorrect,
        group: round.position,
        detail: `${round.hand} at ${round.position}, ${STACK_DEPTH_LABELS[round.depth]} — you: ${actionLabel(choice)}, correct: ${correctAnswerLabel}`,
      })
    } else {
      recordAttempt({
        module: 'facingraise',
        moduleLabel: 'Preflop: vs. a Raise',
        correct: wasCorrect,
        group: round.position,
        detail: `${round.hand} vs ${round.position} open, ${STACK_DEPTH_LABELS[round.depth]} — you: ${actionLabel(choice)}, correct: ${correctAnswerLabel}`,
      })
    }
  }

  function next() {
    setRound(newRound())
    setAnswer(null)
    setShowChart(false)
  }

  useHotkeys({
    r: () => pick(round.kind === 'firstIn' ? 'open' : 'threeBet'),
    f: () => pick('fold'),
    c: () => pick('call'),
    enter: () => answer !== null && next(),
    ' ': () => answer !== null && next(),
  })

  function chartClass(label: string): string {
    if (round.kind === 'firstIn') {
      if (isMixedOpenHand(round.depth, round.position, label)) return 'bg-sky-600/80 text-white'
      return STACK_DEPTH_RANGES[round.depth][round.position].has(label)
        ? 'bg-emerald-600/80 text-white'
        : 'bg-slate-800 text-slate-500'
    }
    if (isMixedCallHand(round.depth, round.position, label)) return 'bg-sky-600/80 text-white'
    const action = correctVsOpenAction(round.depth, round.position, label)
    // At 20bb call/threeBet are the same action, so one merged "continue" color.
    if (round.depth === 'short') return action === 'fold' ? 'bg-slate-800 text-slate-500' : 'bg-amber-600/80 text-white'
    if (action === 'threeBet') return 'bg-amber-600/80 text-white'
    if (action === 'call') return 'bg-emerald-600/80 text-white'
    return 'bg-slate-800 text-slate-500'
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-400 text-sm text-center max-w-sm">
        {round.kind === 'firstIn'
          ? `You're first to act, everyone else folds to you, at ${STACK_DEPTH_LABELS[round.depth]}. Should you ${openLabel.toLowerCase()} or fold?`
          : `${POSITION_NAMES[round.position]} opens, action folds to you, at ${STACK_DEPTH_LABELS[round.depth]}. Fold, call, or ${aggroLabel.toLowerCase()}?`}
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
          {round.kind === 'firstIn' ? POSITION_NAMES[round.position] : `vs. ${POSITION_NAMES[round.position]} open`} ·{' '}
          {STACK_DEPTH_LABELS[round.depth]}
        </div>
        <div
          key={round.hand + round.kind + round.position + round.depth}
          className="animate-pop-in text-6xl font-bold tracking-wide bg-slate-800 rounded-xl px-10 py-6 border border-slate-700"
        >
          {round.hand}
        </div>
      </div>

      {answer === null && (
        <HintBox>
          {round.kind === 'firstIn' ? POSITION_HINTS[round.position] : OPENER_HINTS[round.position]}
          {round.kind === 'firstIn'
            ? OPEN_DEPTH_HINTS[round.depth]
              ? ` ${OPEN_DEPTH_HINTS[round.depth]}`
              : ''
            : RESPONSE_DEPTH_HINTS[round.depth]
              ? ` ${RESPONSE_DEPTH_HINTS[round.depth]}`
              : ''}
        </HintBox>
      )}

      {teachingMode && round.kind === 'facingOpen' && answer === null && (
        <div className="w-full max-w-xl flex flex-col items-center gap-2 animate-fade-in">
          <div className="text-xs text-slate-400">
            {POSITION_NAMES[round.position]}'s opening range at {STACK_DEPTH_LABELS[round.depth]} — this is what
            villain could actually be holding:
          </div>
          <RangeGrid cellClass={villainOpenRangeClass(round.depth, round.position)} highlight={round.hand} />
          <div className="flex gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-rose-600/80" /> In villain's range
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-800 border border-slate-600" /> Not in
              range
            </span>
          </div>
        </div>
      )}

      {answer === null ? (
        <div className="flex gap-4">
          {round.kind === 'firstIn' ? (
            <>
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
            </>
          ) : (
            <>
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
            </>
          )}
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
              ? isMixed
                ? `Correct! (${correctAnswerLabel} — this hand is a real toss-up either way)`
                : 'Correct!'
              : `Not quite — correct answer is ${correctAnswerLabel.toUpperCase()}`}
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
        {showChart ? 'Hide' : 'Show'}{' '}
        {round.kind === 'firstIn' ? POSITION_NAMES[round.position] : `vs. ${POSITION_NAMES[round.position]}`} ·{' '}
        {STACK_DEPTH_LABELS[round.depth]} chart
      </button>

      {showChart && (
        <div className="w-full max-w-xl flex flex-col items-center gap-2 animate-fade-in">
          <RangeGrid cellClass={chartClass} highlight={round.hand} />
          <div className="flex gap-4 text-xs text-slate-400 flex-wrap justify-center">
            {round.kind === 'firstIn' ? (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600/80" /> {openLabel}
              </span>
            ) : round.depth === 'short' ? (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-amber-600/80" /> Call or Shove
              </span>
            ) : (
              <>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-amber-600/80" /> {aggroLabel}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-600/80" /> Call
                </span>
              </>
            )}
            {round.depth !== 'short' && (
              <span className="flex items-center gap-1">
                <span className="inline-block w-3 h-3 rounded-sm bg-sky-600/80" /> Mixed (either is correct)
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-slate-800 border border-slate-600" />{' '}
              Fold
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 max-w-md text-center">
        100bb and 40bb ranges are hand-authored approximations for practicing
        recognition, not solved GTO output. The 20bb boundary is different: a
        chip-EV Nash equilibrium actually computed for this app (fictitious
        play over Monte Carlo simulation, no ICM/antes) — which is why it's
        tighter than many "practical" push/fold charts built to exploit
        opponents who fold too much, rather than to be unexploitable against
        a perfect caller. At 20bb facing an open, Call and {aggroLabel} are
        graded as equally correct since they're the same all-in action. At
        100bb/40bb, one hand-picked boundary hand per position/depth is
        graded as a real mix — real solves often split the weakest
        continuing combo between two actions instead of playing it purely
        one way, so both are marked correct there too.
      </p>
    </div>
  )
}
