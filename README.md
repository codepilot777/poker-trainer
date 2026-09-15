# Poker Trainer

A web app for drilling five core No-Limit Hold'em skills, plus a study tool
and a reference:

- **Preflop Ranges** — shown a random starting hand, position, and stack
  depth (100bb deep, 40bb medium, or 20bb short/push-fold), decide whether
  to open (raise, or shove at 20bb) or fold. Depth changes the correct
  range: shorter stacks widen from fold equity instead of tightening.
  Reveal the full 13x13 range chart for the position + depth at any time.
- **Facing a Raise** — shown an opener's position, stack depth, and a
  random hand, decide fold, call, or 3-bet (shove at 20bb), checked
  against response ranges grouped by opener tier (UTG/MP, CO, BTN/SB) and
  by depth — at 20bb a flat call barely exists, it's mostly shove-or-fold.
- **Pot Odds & EV** — given a pot size and a bet to call, calculate the
  minimum equity needed to call, or the EV of calling given an assumed
  equity.
- **Postflop Decisions** — shown a hole cards + board scenario and a bet to
  call, decide call or fold. Your equity is estimated via Monte Carlo
  simulation against an approximate villain betting range (wider for small
  bets, tighter for big bets) and compared to the pot odds required to call.
- **Bet Sizing** — no bet in front of you: check, bet small (33% pot), or
  bet big (75% pot)? Checked against an equity-bucket heuristic (bigger
  edge → bigger value bet, thin edge → small bet, no edge → check) against
  an approximate opponent continuing range.

## Range Explorer

A study tool (not a quiz) for comparing two ranges' equity against each
other on a given board — pick any two ranges from the app's range library
(preflop opens, facing-a-raise responses, postflop villain tiers), any
street, reroll the board, and see the equity split plus both ranges'
13x13 charts side by side. A lightweight version of what tools like
Flopzilla or Equilab do for range-vs-range study.

## In-practice hints

Every drill can show a contextual, non-spoiling hint above the answer
buttons (💡) — the underlying concept for the current scenario (why this
position/depth/tier matters, the pot odds formula, the bet-sizing
heuristic) without giving away the actual answer. Toggle it globally with
the "Hints" button in the top-right corner; the setting persists in
`localStorage`. For a deeper dive beyond in-the-moment hints, there's also
a standalone **Learn** tab with short reference sections: positions and
why they matter, how to read a range chart, the pot odds/EV formulas
worked through, postflop bet-sizing theory, and a glossary of common terms
(equity, range, 3-bet, c-bet, VPIP, GTO, blocker).

## Progress tracking

A **Progress** tab tracks every answer you give (saved to `localStorage`, no
account or server) and shows overall and per-drill accuracy, a breakdown by
position/tier so you can see where you're weakest, and a running list of
your most recent mistakes. It's per-browser only — clearing site data or
switching devices resets it.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build
```

Built with React, TypeScript, Vite, and Tailwind CSS. No backend — all hand
evaluation and equity estimation runs client-side.

## Keyboard shortcuts

Each drill supports single-key answers for faster reps: R/F for raise/fold,
F/C/R for fold/call/3-bet, C/F for call/fold, X/S/B for check/bet small/bet
big, and Enter (or Space) to advance to the next question once answered.

## Offline use

The app is a PWA: after your first visit, a service worker precaches the
app so it keeps working with no network connection, and it can be installed
to your phone/desktop home screen ("Add to Home Screen" / the browser's
install icon) for an app-like experience.

## Notes on accuracy

Most preflop, 3-bet, and postflop villain ranges are hand-authored
approximations meant for practicing decision-making concepts (range
recognition, pot odds vs. equity), not a solved GTO/solver output. Postflop
equity is estimated against a fixed range tier picked from bet size, not a
read on a specific opponent's actual tendencies.

The 20bb shove ranges are the exception: they're an actually-computed
chip-EV Nash equilibrium (fictitious play over Monte Carlo simulation using
this app's own hand evaluator), not hand-authored. That also makes them
tighter than many popular "practical" push/fold charts, which are often
deliberately built wider to exploit opponents who over-fold rather than to
be a true unexploitable equilibrium. Simplifications: a flat 20bb effective
stack for every seat, no ante, blinds abstracted to a flat 1.5bb dead-money
pot, and each of the five shove positions solved as an independent subgame
rather than one fully joint equilibrium.
