import { useState } from 'react'
import { evOfCall, potOdds } from '../lib/equity'

type QuestionType = 'potOdds' | 'ev'

interface Question {
  type: QuestionType
  pot: number
  bet: number
  equityPct?: number // only for EV questions
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function newQuestion(): Question {
  const pot = randomInt(20, 300)
  const bet = randomInt(10, Math.round(pot * 1.2))
  const type: QuestionType = Math.random() < 0.5 ? 'potOdds' : 'ev'
  if (type === 'potOdds') return { type, pot, bet }
  return { type, pot, bet, equityPct: randomInt(15, 70) }
}

export function PotOddsTrainer() {
  const [q, setQ] = useState<Question>(() => newQuestion())
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; correctValue: number } | null>(
    null,
  )
  const [score, setScore] = useState({ correct: 0, total: 0 })

  function correctValue(): number {
    if (q.type === 'potOdds') return potOdds(q.bet, q.pot) * 100
    return evOfCall((q.equityPct ?? 0) / 100, q.pot, q.bet)
  }

  function submit() {
    if (feedback !== null) return
    const userVal = parseFloat(input)
    if (Number.isNaN(userVal)) return
    const target = correctValue()
    const tolerance = q.type === 'potOdds' ? 1.5 : Math.max(1, Math.abs(target) * 0.05)
    const correct = Math.abs(userVal - target) <= tolerance
    setFeedback({ correct, correctValue: target })
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }))
  }

  function next() {
    setQ(newQuestion())
    setInput('')
    setFeedback(null)
  }

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-300">
        Score: <span className="text-white font-semibold">{score.correct}</span> / {score.total}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl px-8 py-6 w-full max-w-lg text-center flex flex-col gap-3">
        <div className="text-slate-400 text-sm">Pot before your action</div>
        <div className="text-3xl font-bold">${q.pot}</div>
        <div className="text-slate-400 text-sm mt-2">Villain bets, you must call</div>
        <div className="text-3xl font-bold">${q.bet}</div>
        {q.type === 'ev' && (
          <>
            <div className="text-slate-400 text-sm mt-2">Your estimated equity</div>
            <div className="text-3xl font-bold">{q.equityPct}%</div>
          </>
        )}
      </div>

      <div className="text-center max-w-md">
        {q.type === 'potOdds' ? (
          <p className="text-slate-300">
            What minimum equity (%) do you need to profitably call?
          </p>
        ) : (
          <p className="text-slate-300">What is the EV ($) of calling?</p>
        )}
      </div>

      <div className="flex gap-3 items-center">
        <input
          type="number"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          disabled={feedback !== null}
          placeholder={q.type === 'potOdds' ? 'e.g. 25' : 'e.g. -5.5'}
          className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 w-40 text-center text-lg disabled:opacity-60"
        />
        {feedback === null ? (
          <button
            onClick={submit}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            Submit
          </button>
        ) : (
          <button
            onClick={next}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold"
          >
            Next
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={[
            'px-4 py-2 rounded-lg font-semibold text-center',
            feedback.correct ? 'bg-emerald-600/20 text-emerald-400' : 'bg-rose-600/20 text-rose-400',
          ].join(' ')}
        >
          {feedback.correct ? 'Correct!' : 'Not quite.'} Answer:{' '}
          {q.type === 'potOdds'
            ? `${feedback.correctValue.toFixed(1)}%`
            : `$${feedback.correctValue.toFixed(2)}`}
        </div>
      )}

      <p className="text-xs text-slate-500 max-w-md text-center">
        Pot odds = bet / (pot + bet). EV of a call = equity × (pot + bet) − (1 − equity) × bet.
      </p>
    </div>
  )
}
