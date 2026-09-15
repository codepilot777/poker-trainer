import { useState } from 'react'
import { SettingsContext, readHintsEnabled, writeHintsEnabled } from './lib/settings'
import { PreflopTrainer } from './modules/PreflopTrainer'
import { FacingRaiseTrainer } from './modules/FacingRaiseTrainer'
import { PotOddsTrainer } from './modules/PotOddsTrainer'
import { PostflopTrainer } from './modules/PostflopTrainer'
import { BetSizingTrainer } from './modules/BetSizingTrainer'
import { RangeExplorer } from './modules/RangeExplorer'
import { LearnView } from './modules/LearnView'
import { ProgressView } from './modules/ProgressView'

type Tab =
  | 'preflop'
  | 'facingraise'
  | 'potodds'
  | 'postflop'
  | 'betsizing'
  | 'rangeexplorer'
  | 'learn'
  | 'progress'

const DRILL_TABS: { id: Tab; label: string; shortLabel: string }[] = [
  { id: 'preflop', label: 'Preflop Ranges', shortLabel: 'Preflop' },
  { id: 'facingraise', label: 'Facing a Raise', shortLabel: 'vs. Raise' },
  { id: 'potodds', label: 'Pot Odds & EV', shortLabel: 'Pot Odds' },
  { id: 'postflop', label: 'Postflop Decisions', shortLabel: 'Postflop' },
  { id: 'betsizing', label: 'Bet Sizing', shortLabel: 'Sizing' },
]

const TOOL_TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'rangeexplorer', label: 'Range Explorer', icon: '🔀' },
  { id: 'learn', label: 'Learn', icon: '📘' },
  { id: 'progress', label: 'Progress', icon: '📊' },
]

function App() {
  const [tab, setTab] = useState<Tab>('preflop')
  const [hintsEnabled, setHintsEnabledState] = useState(() => readHintsEnabled())

  function setHintsEnabled(v: boolean) {
    setHintsEnabledState(v)
    writeHintsEnabled(v)
  }

  return (
    <SettingsContext.Provider value={{ hintsEnabled, setHintsEnabled }}>
    <div className="min-h-screen bg-[#0f1115] text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 flex flex-col gap-5 sm:gap-8">
        <header className="text-center relative">
          <button
            onClick={() => setHintsEnabled(!hintsEnabled)}
            className={[
              'absolute right-0 top-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95',
              hintsEnabled
                ? 'bg-sky-500/15 text-sky-300 border-sky-500/40'
                : 'bg-transparent text-slate-500 border-slate-700 hover:text-slate-300',
            ].join(' ')}
            title="Toggle in-practice hints"
          >
            💡 Hints {hintsEnabled ? 'On' : 'Off'}
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">♠ Poker Trainer</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">
            Drill ranges, bet sizing, and pot odds — plus a range explorer and
            quick lessons
          </p>
        </header>

        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide text-center sm:text-left sm:pl-0.5">
            Practice
          </div>
          <nav className="flex justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
            {DRILL_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={[
                  'shrink-0 px-3.5 py-2 rounded-lg font-medium text-sm sm:text-base transition-all active:scale-95',
                  tab === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                ].join(' ')}
              >
                <span className="sm:hidden">{t.shortLabel}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <nav className="flex justify-center gap-2 flex-wrap -mt-2 sm:-mt-4">
          {TOOL_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium text-sm transition-all active:scale-95 border',
                tab === t.id
                  ? 'bg-slate-700 text-white border-slate-500'
                  : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200',
              ].join(' ')}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>

        <main key={tab} className="animate-fade-in">
          {tab === 'preflop' && <PreflopTrainer />}
          {tab === 'facingraise' && <FacingRaiseTrainer />}
          {tab === 'potodds' && <PotOddsTrainer />}
          {tab === 'postflop' && <PostflopTrainer />}
          {tab === 'betsizing' && <BetSizingTrainer />}
          {tab === 'rangeexplorer' && <RangeExplorer />}
          {tab === 'learn' && <LearnView />}
          {tab === 'progress' && <ProgressView />}
        </main>
      </div>
    </div>
    </SettingsContext.Provider>
  )
}

export default App
