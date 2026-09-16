# Poker Trainer

A web app for drilling No-Limit Hold'em decisions across two streets, plus a
study tool and a reference. Practice is deliberately kept to two drills —
**Preflop** and **Flop** — each covering the full realistic action set for
that street, rather than splitting each situation into its own separate
drill:

- **Preflop** — two scenario types, mixed randomly:
  - *First to act*: shown a random starting hand, position, and stack depth
    (100bb deep, 40bb medium, or 20bb short/push-fold), decide whether to
    open (raise, or shove at 20bb) or fold. Depth changes the correct range:
    shorter stacks widen from fold equity instead of tightening.
  - *Facing an open*: shown an opener's exact position, stack depth, and a
    random hand, decide fold, call, or 3-bet (shove at 20bb), checked
    against response ranges for that exact opener position and depth — at
    20bb a flat call barely exists, it's mostly shove-or-fold, so call and
    shove are graded as equally correct (same all-in chip-EV action).

  At 100bb/40bb, one hand-picked boundary hand per position/depth (the
  weakest hand right at the edge of open-or-fold, or of call-or-fold) is
  graded as a genuine mixed strategy — either action is accepted, matching
  how real solves often split a range's weakest combo between two actions
  instead of playing it purely one way. It's marked with a distinct color
  on the range chart.

  Reveal the full 13x13 range chart for the current position + depth at any
  time.

- **Flop** — two scenario types, mixed randomly, both with a real preflop
  line behind them (you opened and got called/3-bet, or you called someone
  else's open, using the same position/depth range data as the Preflop
  drill) so villain's range going into the flop is chip-consistent with what
  actually happened preflop, not just picked at random:
  - *Facing a bet*: shown hole cards, a 3-card board, and a bet to call,
    decide fold, call, or raise. Villain's range narrows from their real
    preflop range to whichever of those hands would bet this size on this
    board (wider for small bets, tighter for big bets). Your equity vs. that
    range is estimated via Monte Carlo simulation; EV of folding, calling,
    and raising (to a fixed 3x the bet, against a simplified model of which
    of villain's hands continue vs. fold to a raise) are compared to find
    the best action. This EV comparison — and the pot-odds-vs-equity idea
    behind the call/fold half of it — is the same concept the old "Pot Odds
    & EV" drill isolated on its own; here it's folded into this drill's
    feedback instead of being a separate quiz.
  - *First to act*: no bet in front of you yet — check, bet small (33%
    pot), or bet big (75% pot)? Same preflop-line-aware villain range,
    narrowed to a plausible continuing range since hero hasn't bet, checked
    against an equity-bucket heuristic (bigger edge → bigger value bet,
    thin edge → small bet, no edge → check).

  Optional toggles (off by default) mix in 3-bet pots and multiway pots
  alongside the default single-raised heads-up pot, so villain's range and
  pot sizing adjust accordingly. The Flop drill only offers 100bb/40bb
  depths, since postflop play doesn't really exist at 20bb push/fold.

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

Each drill supports single-key answers for faster reps: R/F for open (or
shove)/fold, F/C/R for fold/call/3-bet (Preflop facing an open), C/R/F for
call/raise/fold (Flop facing a bet), X/S/B for check/bet small/bet big (Flop
first to act), and Enter (or Space) to advance to the next question once
answered.

## Offline use

The app is a PWA: after your first visit, a service worker precaches the
app so it keeps working with no network connection, and it can be installed
to your phone/desktop home screen ("Add to Home Screen" / the browser's
install icon) for an app-like experience.

## Notes on accuracy

Most preflop, 3-bet, and flop villain ranges are hand-authored
approximations meant for practicing decision-making concepts (range
recognition, pot odds vs. equity), not a solved GTO/solver output. Flop
equity is estimated against a range narrowed by bet size, not a read on a
specific opponent's actual tendencies. The raise EV model on the "facing a
bet" scenario is a further simplification: it always sizes the raise to a
fixed 3x the bet, and splits villain's range into "continues" vs. "folds"
by ranking made-hand strength on the board rather than modeling a real
re-raising/bluffing response — it's meant to build the instinct that raising
can be better than calling, not to be a precise solved sizing.

The 20bb shove ranges are the exception: they're an actually-computed
chip-EV Nash equilibrium (fictitious play over Monte Carlo simulation using
this app's own hand evaluator), not hand-authored. That also makes them
tighter than many popular "practical" push/fold charts, which are often
deliberately built wider to exploit opponents who over-fold rather than to
be a true unexploitable equilibrium. Simplifications: a flat 20bb effective
stack for every seat, no ante, blinds abstracted to a flat 1.5bb dead-money
pot, and each of the five shove positions solved as an independent subgame
rather than one fully joint equilibrium.

Mixed strategies and balanced bluffing frequencies aren't modeled in
general — every scenario grades toward a single best-EV action (or, at
20bb, two actions that are actually the same chip-EV decision). The one
deliberate exception is the small hand-picked boundary-hand set in the
Preflop drill described above; the Flop drill doesn't have an equivalent,
since building a genuinely balanced bet/check or bluff/value range would
mean grading a whole range's composition rather than one scenario at a
time — a bigger step than this app's per-hand approximations are set up
for.
