import { useState } from 'react'
import { PreflopTrainer } from './modules/PreflopTrainer'
import { PotOddsTrainer } from './modules/PotOddsTrainer'
import { PostflopTrainer } from './modules/PostflopTrainer'

type Tab = 'preflop' | 'potodds' | 'postflop'

const TABS: { id: Tab; label: string }[] = [
  { id: 'preflop', label: 'Preflop Ranges' },
  { id: 'potodds', label: 'Pot Odds & EV' },
  { id: 'postflop', label: 'Postflop Decisions' },
]

function App() {
  const [tab, setTab] = useState<Tab>('preflop')

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">♠ Poker Trainer</h1>
          <p className="text-slate-400 mt-1">Drill preflop ranges, pot odds, and postflop decisions</p>
        </header>

        <nav className="flex justify-center gap-2 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'px-4 py-2 rounded-lg font-medium transition-colors',
                tab === t.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main>
          {tab === 'preflop' && <PreflopTrainer />}
          {tab === 'potodds' && <PotOddsTrainer />}
          {tab === 'postflop' && <PostflopTrainer />}
        </main>
      </div>
    </div>
  )
}

export default App
