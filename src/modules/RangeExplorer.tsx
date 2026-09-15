import { useMemo, useState } from 'react'
import type { Card } from '../lib/cards'
import { cardLabel, makeDeck, shuffle } from '../lib/cards'
import { estimateRangeVsRangeEquity } from '../lib/equity'
import { RANGE_LIBRARY, findRange, rangeAtDepth, isDepthDependent } from '../data/rangeLibrary'
import { STACK_DEPTHS, STACK_DEPTH_LABELS, type StackDepth } from '../data/stackDepthRanges'
import { RangeGrid } from '../components/RangeGrid'
import { CardChip } from '../components/CardChip'

type Street = 'preflop' | 'flop' | 'turn' | 'river'

const STREET_SIZE: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 }
const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river']

const DEPTH_SHORT_LABEL: Record<StackDepth, string> = { deep: '100bb', medium: '40bb', short: '20bb' }

function newBoard(street: Street): Card[] {
  return shuffle(makeDeck()).slice(0, STREET_SIZE[street])
}

export function RangeExplorer() {
  const [rangeAId, setRangeAId] = useState('open-btn')
  const [rangeBId, setRangeBId] = useState('vs-btn-call')
  const [depth, setDepth] = useState<StackDepth>('deep')
  const [street, setStreet] = useState<Street>('flop')
  const [board, setBoard] = useState<Card[]>(() => newBoard('flop'))

  const rangeAEntry = findRange(rangeAId)
  const rangeBEntry = findRange(rangeBId)
  const rangeA = rangeAtDepth(rangeAEntry, depth)
  const rangeB = rangeAtDepth(rangeBEntry, depth)
  const depthMatters = isDepthDependent(rangeAEntry) || isDepthDependent(rangeBEntry)

  function changeStreet(s: Street) {
    setStreet(s)
    setBoard(newBoard(s))
  }

  function rerollBoard() {
    setBoard(newBoard(street))
  }

  const result = useMemo(
    () => estimateRangeVsRangeEquity(rangeA, rangeB, board, 1200),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rangeAId, rangeBId, depth, board],
  )

  return (
    <div className="flex flex-col gap-6 items-center">
      <div className="text-slate-400 text-sm text-center max-w-md">
        Compare two ranges' equity against each other on a given board — a
        lightweight range-vs-range study tool.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Range A
          <select
            value={rangeAId}
            onChange={(e) => setRangeAId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
          >
            {RANGE_LIBRARY.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Range B
          <select
            value={rangeBId}
            onChange={(e) => setRangeBId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
          >
            {RANGE_LIBRARY.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <div className="flex flex-wrap justify-center gap-2">
          {STACK_DEPTHS.map((d) => (
            <button
              key={d}
              onClick={() => setDepth(d)}
              className={[
                'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95',
                depth === d
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
              ].join(' ')}
            >
              {DEPTH_SHORT_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500">
          {depthMatters
            ? `Open/response ranges shown at ${STACK_DEPTH_LABELS[depth]}.`
            : "Selected ranges are betting-range tiers (by bet size) — depth doesn't change them."}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {STREETS.map((s) => (
          <button
            key={s}
            onClick={() => changeStreet(s)}
            className={[
              'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 capitalize',
              street === s
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
            ].join(' ')}
          >
            {s}
          </button>
        ))}
        {street !== 'preflop' && (
          <button
            onClick={rerollBoard}
            className="px-3.5 py-1.5 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 active:scale-95 transition-all"
          >
            New board
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 min-h-16">
        {board.length > 0 ? (
          <div key={board.map(cardLabel).join()} className="flex gap-2 animate-pop-in">
            {board.map((c) => (
              <CardChip key={cardLabel(c)} card={c} />
            ))}
          </div>
        ) : (
          <div className="text-slate-500 text-sm">Preflop — no board yet</div>
        )}
      </div>

      {result.effectiveTrials === 0 ? (
        <div className="text-rose-400 text-sm text-center max-w-sm">
          These ranges can't both be dealt on this board (every combo blocks the
          other range) — try a different board or range pair.
        </div>
      ) : (
        <div className="flex gap-6 sm:gap-10 items-center">
          <div className="text-center">
            <div className="text-sm text-slate-400 max-w-[10rem] truncate">{rangeAEntry.label}</div>
            <div className="text-4xl font-bold text-emerald-400">
              {(result.equityA * 100).toFixed(1)}%
            </div>
          </div>
          <div className="text-slate-600 text-2xl font-light">vs</div>
          <div className="text-center">
            <div className="text-sm text-slate-400 max-w-[10rem] truncate">{rangeBEntry.label}</div>
            <div className="text-4xl font-bold text-amber-400">
              {(result.equityB * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-slate-400">{rangeAEntry.label}</div>
          <RangeGrid inRange={rangeA} />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="text-sm text-slate-400">{rangeBEntry.label}</div>
          <RangeGrid inRange={rangeB} />
        </div>
      </div>

      <p className="text-xs text-slate-500 max-w-md text-center">
        Equity is estimated via simulation, sampling each range's actual combo
        counts (card removal applied between the two hands, not the board they
        might otherwise share) — same approach as tools like Flopzilla or
        Equilab, simplified. Open and response ranges shift with the selected
        effective stack depth; betting-range tiers are keyed to bet size, so
        depth doesn't change them.
      </p>
    </div>
  )
}
