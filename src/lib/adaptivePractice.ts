import { getAttempts, summarize } from './progressStore'

/** Below this many attempts in a group, there isn't enough signal to act on — stay neutral. */
const MIN_ATTEMPTS_FOR_WEIGHTING = 5
/** A group at 0% accuracy is drawn at most this many times more often than one at 100%. */
const MAX_WEIGHT_MULTIPLIER = 3

/**
 * Adaptive practice: reads a module's per-group accuracy from Progress
 * history (the same `group` breakdown the Progress tab already shows —
 * e.g. position, or bet-size tier) and returns a weight for each group —
 * worse accuracy means a higher weight, so weak spots come up more often.
 * A group with fewer than MIN_ATTEMPTS_FOR_WEIGHTING attempts (including
 * one never attempted) is left out of the map entirely, so a new user (or
 * a rarely-seen group) sees plain uniform-random practice until there's
 * enough signal to act on.
 */
export function groupWeights(moduleId: string): Map<string, number> {
  const summary = summarize(getAttempts())
  const mod = summary.byModule.find((m) => m.module === moduleId)
  const weights = new Map<string, number>()
  if (!mod) return weights
  for (const g of mod.groups) {
    if (g.total < MIN_ATTEMPTS_FOR_WEIGHTING) continue
    const accuracy = g.correct / g.total
    weights.set(g.group, 1 + (MAX_WEIGHT_MULTIPLIER - 1) * (1 - accuracy))
  }
  return weights
}

/** Weighted random pick — an option missing from `weights` gets the neutral weight of 1. */
export function weightedPick<T>(options: readonly T[], weights: Map<string, number>, keyFor: (opt: T) => string): T {
  const w = options.map((opt) => weights.get(keyFor(opt)) ?? 1)
  const total = w.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < options.length; i++) {
    r -= w[i]
    if (r <= 0) return options[i]
  }
  return options[options.length - 1]
}
