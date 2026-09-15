import { createContext, useContext } from 'react'

const HINTS_KEY = 'poker-trainer-hints-enabled'
const INCLUDE_3BET_KEY = 'poker-trainer-include-3bet-pots'
const INCLUDE_MULTIWAY_KEY = 'poker-trainer-include-multiway'

export function readHintsEnabled(): boolean {
  try {
    const raw = localStorage.getItem(HINTS_KEY)
    return raw === null ? true : raw === 'true' // default on
  } catch {
    return true
  }
}

export function writeHintsEnabled(enabled: boolean) {
  try {
    localStorage.setItem(HINTS_KEY, String(enabled))
  } catch {
    // localStorage unavailable — setting just won't persist.
  }
}

/**
 * Both default off: existing single-raised, heads-up postflop scenarios
 * stay the only kind until a user opts into the wider mix.
 */
export function readInclude3BetPots(): boolean {
  try {
    return localStorage.getItem(INCLUDE_3BET_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeInclude3BetPots(enabled: boolean) {
  try {
    localStorage.setItem(INCLUDE_3BET_KEY, String(enabled))
  } catch {
    // localStorage unavailable — setting just won't persist.
  }
}

export function readIncludeMultiway(): boolean {
  try {
    return localStorage.getItem(INCLUDE_MULTIWAY_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeIncludeMultiway(enabled: boolean) {
  try {
    localStorage.setItem(INCLUDE_MULTIWAY_KEY, String(enabled))
  } catch {
    // localStorage unavailable — setting just won't persist.
  }
}

export const SettingsContext = createContext<{
  hintsEnabled: boolean
  setHintsEnabled: (v: boolean) => void
  include3BetPots: boolean
  setInclude3BetPots: (v: boolean) => void
  includeMultiway: boolean
  setIncludeMultiway: (v: boolean) => void
}>({
  hintsEnabled: true,
  setHintsEnabled: () => {},
  include3BetPots: false,
  setInclude3BetPots: () => {},
  includeMultiway: false,
  setIncludeMultiway: () => {},
})

export function useHints() {
  return useContext(SettingsContext)
}

/** Shared by the drills that vary their pot type (Postflop Decisions, Bet Sizing). */
export function useScenarioMix() {
  return useContext(SettingsContext)
}
