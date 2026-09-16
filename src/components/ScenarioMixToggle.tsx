import { useScenarioMix, type StreetFocus } from '../lib/settings'

const STREET_OPTIONS: { id: StreetFocus; label: string }[] = [
  { id: 'mixed', label: 'Mixed' },
  { id: 'flop', label: 'Flop' },
  { id: 'turn', label: 'Turn' },
  { id: 'river', label: 'River' },
]

/** Shared by Postflop Decisions and Bet Sizing: which pot types can appear, and which street. */
export function ScenarioMixToggle() {
  const { include3BetPots, setInclude3BetPots, includeMultiway, setIncludeMultiway, streetFocus, setStreetFocus } =
    useScenarioMix()

  function chipClass(active: boolean): string {
    return [
      'px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all active:scale-95 border',
      active
        ? 'bg-indigo-600 text-white border-indigo-500'
        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700',
    ].join(' ')
  }

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex flex-col items-center gap-1">
        <div className="flex flex-wrap justify-center gap-2">
          {STREET_OPTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setStreetFocus(s.id)}
              className={chipClass(streetFocus === s.id)}
              title={s.id === 'mixed' ? 'Random street each scenario' : `Only deal ${s.label.toLowerCase()} scenarios`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 text-center max-w-sm">
          {streetFocus === 'mixed'
            ? 'Board runs to a random street each scenario.'
            : `Drilling ${streetFocus} spots only — earlier streets (if any) checked through to get there.`}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setInclude3BetPots(!include3BetPots)}
          className={chipClass(include3BetPots)}
          title="Mix in 3-bet pot scenarios alongside single-raised pots"
        >
          {include3BetPots ? '✓ ' : ''}3-bet pots
        </button>
        <button
          onClick={() => setIncludeMultiway(!includeMultiway)}
          className={chipClass(includeMultiway)}
          title="Mix in multiway (3-handed) pot scenarios alongside heads-up pots"
        >
          {includeMultiway ? '✓ ' : ''}Multiway pots
        </button>
      </div>
      <div className="text-xs text-slate-500 text-center max-w-sm -mt-1.5">
        {include3BetPots || includeMultiway
          ? 'Scenarios will be mixed in with single-raised, heads-up pots.'
          : 'Off by default — every scenario is a single-raised, heads-up pot.'}
      </div>
    </div>
  )
}
