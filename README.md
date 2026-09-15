# Poker Trainer

A web app for drilling four core No-Limit Hold'em skills:

- **Preflop Ranges** — shown a random starting hand and a position, decide
  whether to open-raise or fold, checked against simplified 6-max first-in
  open-raise ranges. Reveal the full 13x13 range chart for the position at
  any time.
- **Facing a Raise** — shown an opener's position and a random hand, decide
  fold, call, or 3-bet, checked against response ranges grouped into three
  tiers (UTG/MP, CO, BTN/SB) by how wide the opener's range likely is.
- **Pot Odds & EV** — given a pot size and a bet to call, calculate the
  minimum equity needed to call, or the EV of calling given an assumed
  equity.
- **Postflop Decisions** — shown a hole cards + board scenario and a bet to
  call, decide call or fold. Your equity is estimated via Monte Carlo
  simulation against an approximate villain betting range (wider for small
  bets, tighter for big bets) and compared to the pot odds required to call.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build
```

Built with React, TypeScript, Vite, and Tailwind CSS. No backend — all hand
evaluation and equity estimation runs client-side.

## Offline use

The app is a PWA: after your first visit, a service worker precaches the
app so it keeps working with no network connection, and it can be installed
to your phone/desktop home screen ("Add to Home Screen" / the browser's
install icon) for an app-like experience.

## Notes on accuracy

The preflop, 3-bet, and postflop villain ranges are hand-authored
approximations meant for practicing decision-making concepts (range
recognition, pot odds vs. equity), not a solved GTO/solver output. Postflop
equity is estimated against a fixed range tier picked from bet size, not a
read on a specific opponent's actual tendencies.
