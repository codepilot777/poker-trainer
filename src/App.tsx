import { useState } from 'react'
import { PreflopTrainer } from './modules/PreflopTrainer'
import { FacingRaiseTrainer } from './modules/FacingRaiseTrainer'
import { PotOddsTrainer } from './modules/PotOddsTrainer'
import { PostflopTrainer } from './modules/PostflopTrainer'

type Tab = 'preflop' | 'facingraise' | 'potodds' | 'postflop'

const TABS: { id: Tab; label: string; shortLabel: string }[] = [
  { id: 'preflop', label: 'Preflop Ranges', shortLabel: 'Preflop' },
  { id: 'facingraise', label: 'Facing a Raise', shortLabel: 'vs. Raise' },
  { id: 'potodds', label: 'Pot Odds & EV', shortLabel: 'Pot Odds' },
  { id: 'postflop', label: 'Postflop Decisions', shortLabel: 'Postflop' },
]

function App() {
  const [tab, setTab] = useState<Tab>('preflop')

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-5 sm:py-8 flex flex-col gap-5 sm:gap-8">
        <header className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">♠ Poker Trainer</h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">
            Drill preflop ranges, 3-bet decisions, pot odds, and postflop play
          </p>
        </header>

        <nav className="flex justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {TABS.map((t) => (
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

        <main key={tab} className="animate-fade-in">
          {tab === 'preflop' && <PreflopTrainer />}
          {tab === 'facingraise' && <FacingRaiseTrainer />}
          {tab === 'potodds' && <PotOddsTrainer />}
          {tab === 'postflop' && <PostflopTrainer />}
        </main>
      </div>
    </div>
  )
}

export default App
