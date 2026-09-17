import type { ReactNode } from 'react'

interface Section {
  title: string
  body: ReactNode
}

const SECTIONS: Section[] = [
  {
    title: 'Positions & why they matter',
    body: (
      <>
        <p>
          Position is where you sit relative to the dealer button, and it decides how
          much information you have before you act — acting later means you've seen
          more of what everyone else does. In a 6-max game, from earliest to latest:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>UTG</strong> (Under the Gun) — first to act, acts first on every street. Needs the tightest range.</li>
          <li><strong>MP</strong> (Middle Position) — slightly later, can open a bit wider.</li>
          <li><strong>CO</strong> (Cutoff) — one seat before the button, wide open-raising range.</li>
          <li><strong>BTN</strong> (Button) — acts last on every postflop street, the best seat at the table. Widest range.</li>
          <li><strong>SB</strong> (Small Blind) — posts a forced bet, acts first postflop against everyone except the BB.</li>
        </ul>
        <p className="mt-2">
          The core rule: the earlier you act, the more players can still act
          behind you (and punish a weak hand), so early positions open tighter
          and later positions open wider.
        </p>
      </>
    ),
  },
  {
    title: 'Stack depth & effective stacks',
    body: (
      <>
        <p>
          Your <strong>effective stack</strong> against an opponent is the
          smaller of your two stacks, in big blinds (bb) — that's the most
          money that can actually change hands between you this hand. It
          matters because it caps how much play is left after the current
          bet, which changes what the right decision is even with the same
          cards and the same pot odds. This app drills three benchmark
          depths:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>100bb (deep)</strong> — a full, standard stack. Plenty of room for multi-street play, so ranges and sizing can be more nuanced.</li>
          <li><strong>40bb (medium)</strong> — shallower. The most speculative hands (small suited connectors, weak suited aces) lose value as there's less behind to win when they hit.</li>
          <li><strong>20bb (short / push-fold)</strong> — postflop play barely exists. Open-raising gives way to shoving, and facing a raise becomes mostly shove-or-fold instead of a flat call.</li>
        </ul>
        <p className="mt-2">
          Two ideas connect stack depth to decisions you'll see across the
          drills:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>
            <strong>Implied odds</strong> — deep stacked, a drawing hand can
            profitably call a bit below the raw pot-odds number, because
            hitting can win extra money on later streets. Short stacked
            (especially when the bet is effectively an all-in), there's
            nothing left to win later, so the raw pot-odds/equity comparison
            is the whole story.
          </li>
          <li>
            <strong>Stack-to-pot ratio (SPR)</strong> — as effective stacks
            shrink relative to the pot, bet sizing gets simpler. Deep, thin
            value bets and pot-control lines are worth planning across
            multiple streets; short, one more bet can commit the rest of
            your stack anyway, so sizing collapses toward bet-big-or-check.
          </li>
        </ul>
        <p className="mt-2">
          Both drills in this app — Preflop and Postflop — randomize the
          effective stack depth per question (Postflop only offers
          100bb/40bb, since postflop play doesn't exist at 20bb push/fold),
          and the Range Explorer lets you compare any two ranges at any of
          the three depths.
        </p>
      </>
    ),
  },
  {
    title: 'Reading range charts',
    body: (
      <>
        <p>
          The 13x13 grid used throughout this app represents every possible
          starting hand in Hold'em. Each axis is ranked A down to 2:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Diagonal cells</strong> (e.g. AA, KK) are pairs.</li>
          <li><strong>Upper-right triangle</strong> (e.g. AKs) is suited hands.</li>
          <li><strong>Lower-left triangle</strong> (e.g. AKo) is offsuit hands.</li>
        </ul>
        <p className="mt-2">
          Suited hands make flushes and are generally stronger than the same
          offsuit hand — that's why range charts always show them separately.
          Shorthand like <code className="bg-slate-800 px-1 rounded">ATs+</code>{' '}
          means "AT suited and every suited ace with a better kicker" (AJs,
          AQs, AKs).
        </p>
      </>
    ),
  },
  {
    title: 'Pot odds & EV',
    body: (
      <>
        <p>
          <strong>Pot odds</strong> tell you the minimum equity (win probability)
          you need for a call to break even:
        </p>
        <p className="mt-2 bg-slate-800 rounded-lg px-3 py-2 font-mono text-sm">
          required equity = bet / (pot + bet)
        </p>
        <p className="mt-2">
          Example: pot is $100, villain bets $50. You need{' '}
          <code className="bg-slate-800 px-1 rounded">50 / (100 + 50) = 33%</code>{' '}
          equity to call profitably.
        </p>
        <p className="mt-2">
          <strong>EV (expected value)</strong> turns that into a dollar figure —
          how much you win or lose on average if you made this call many times:
        </p>
        <p className="mt-2 bg-slate-800 rounded-lg px-3 py-2 font-mono text-sm">
          EV of calling = equity × (pot + bet) − (1 − equity) × bet
        </p>
        <p className="mt-2">
          A positive EV call is profitable long-run even if you lose this
          particular hand.
        </p>
      </>
    ),
  },
  {
    title: 'Postflop bet sizing basics',
    body: (
      <>
        <p>
          Bet size should track how big your equity edge is and what you want to
          achieve:
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Bet big (value)</strong> with strong hands — charge worse hands that will still call.</li>
          <li><strong>Bet small (thin value / protection)</strong> with medium-strength hands — keeps worse hands in without letting a draw see a cheap card.</li>
          <li><strong>Check (pot control)</strong> when you don't have enough of an edge to bet profitably, or want to keep the pot small with a marginal hand.</li>
        </ul>
        <p className="mt-2">
          Real strategy also weighs board texture, blockers, and how often you
          should bluff to stay balanced — this app's Postflop drill uses a
          simplified equity-threshold version of the same idea to build the
          underlying instinct.
        </p>
      </>
    ),
  },
  {
    title: 'Glossary',
    body: (
      <dl className="space-y-2">
        {[
          ['Equity', "Your hand's win probability against a hand or range, expressed as a percentage."],
          ['Range', 'The full set of hands a player could plausibly have in a given spot, not just one hand.'],
          ['3-bet', "The second raise preflop (villain's open is the first raise, your reraise is the 3-bet)."],
          ['c-bet', "A continuation bet — betting the flop after raising preflop, continuing the aggression."],
          ['VPIP', "Voluntarily Put money In Pot — how often a player enters a pot, a looseness stat."],
          ['GTO', 'Game Theory Optimal — an unexploitable strategy a solver computes; this app uses hand-authored approximations, not real solver output.'],
          ['Blocker', 'A card in your hand that makes it less likely villain holds a specific combo (e.g. holding the As blocks AA and nut flushes).'],
        ].map(([term, def]) => (
          <div key={term} className="flex flex-col sm:flex-row sm:gap-3">
            <dt className="font-semibold text-slate-200 sm:w-28 shrink-0">{term}</dt>
            <dd className="text-slate-400">{def}</dd>
          </div>
        ))}
      </dl>
    ),
  },
]

export function LearnView() {
  return (
    <div className="flex flex-col gap-3 max-w-2xl mx-auto">
      {SECTIONS.map((s, i) => (
        <details
          key={s.title}
          open={i === 0}
          className="bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 [&_summary]:cursor-pointer"
        >
          <summary className="font-semibold text-slate-100 select-none">{s.title}</summary>
          <div className="mt-3 text-sm text-slate-300 leading-relaxed">{s.body}</div>
        </details>
      ))}
    </div>
  )
}
