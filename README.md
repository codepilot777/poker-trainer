# Poker Trainer

A web app for drilling three core No-Limit Hold'em skills:

- **Preflop Ranges** — shown a random starting hand and a position, decide
  whether to open-raise or fold, checked against simplified 6-max first-in
  open-raise ranges. Reveal the full 13x13 range chart for the position at
  any time.
- **Pot Odds & EV** — given a pot size and a bet to call, calculate the
  minimum equity needed to call, or the EV of calling given an assumed
  equity.
- **Postflop Decisions** — shown a hole cards + board scenario and a bet to
  call, decide call or fold. Your equity is estimated via Monte Carlo
  simulation against a random villain hand and compared to the pot odds
  required to call.

## Development

```bash
npm install
npm run dev      # start dev server
npm run build    # typecheck + production build
```

Built with React, TypeScript, Vite, and Tailwind CSS. No backend — all hand
evaluation and equity estimation runs client-side.

## Notes on accuracy

The preflop ranges and postflop equity estimates are simplified
approximations meant for practicing decision-making concepts (range
recognition, pot odds vs. equity), not a solved GTO/solver output. Postflop
equity is estimated against a uniformly random opponent hand rather than a
realistic range.
