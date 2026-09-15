import { useMemo, useState } from 'react'
import { clearProgress, getAttempts, summarize } from '../lib/progressStore'

function pct(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100)
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function AccuracyBar({ label, correct, total }: { label: string; correct: number; total: number }) {
  const p = pct(correct, total)
  const color = p >= 75 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-sm text-slate-400 text-right">{label}</div>
      <div className="flex-1 h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${p}%` }} />
      </div>
      <div className="w-20 shrink-0 text-sm text-slate-400">
        {p}% <span className="text-slate-600">({total})</span>
      </div>
    </div>
  )
}

export function ProgressView() {
  const [version, setVersion] = useState(0)
  const summary = useMemo(() => summarize(getAttempts()), [version])

  function handleClear() {
    if (!confirm('Clear all saved progress? This cannot be undone.')) return
    clearProgress()
    setVersion((v) => v + 1)
  }

  if (summary.total === 0) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-12">
        <div className="text-slate-400">
          No attempts recorded yet — answer a few questions in the other tabs and your
          progress will show up here.
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="text-sm text-slate-400">Overall accuracy</div>
        <div className="text-4xl font-bold mt-1">{pct(summary.correct, summary.total)}%</div>
        <div className="text-slate-500 text-sm mt-1">
          {summary.correct} / {summary.total} correct all-time
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {summary.byModule.map((m) => (
          <div key={m.module} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <div className="font-semibold">{m.moduleLabel}</div>
              <div className="text-sm text-slate-400">
                {pct(m.correct, m.total)}% ({m.correct}/{m.total})
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {m.groups
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((g) => (
                  <AccuracyBar key={g.group} label={g.group} correct={g.correct} total={g.total} />
                ))}
            </div>
          </div>
        ))}
      </div>

      {summary.recentMistakes.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-slate-300">Recent mistakes</div>
          <div className="flex flex-col gap-1.5">
            {summary.recentMistakes.map((m, i) => (
              <div
                key={i}
                className="text-sm text-slate-400 bg-slate-800/40 rounded-lg px-3 py-2 flex justify-between gap-3"
              >
                <span>{m.detail}</span>
                <span className="text-slate-600 shrink-0">{timeAgo(m.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleClear}
        className="self-center text-sm text-slate-500 underline hover:text-rose-400"
      >
        Clear progress history
      </button>

      <p className="text-xs text-slate-500 text-center">
        Progress is saved in this browser only (no account, no server) — it won't follow
        you to another device and clears if you clear site data.
      </p>
    </div>
  )
}
