import { createContext, useContext } from 'react'

const HINTS_KEY = 'poker-trainer-hints-enabled'
const INCLUDE_3BET_KEY = 'poker-trainer-include-3bet-pots'
const INCLUDE_MULTIWAY_KEY = 'poker-trainer-include-multiway'
const TEACHING_MODE_KEY = 'poker-trainer-teaching-mode'

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
 * Both default off: existing single-raised, heads-up flop scenarios stay
 * the only kind until a user opts into the wider mix.
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

/**
 * Off by default: the app's default flow is deciding blind, then checking
 * villain's range afterward. Teaching mode flips that — villain's range is
 * shown up front, before you act — for building intuition about range
 * reasoning rather than drilling the under-uncertainty decision itself.
 */
export function readTeachingMode(): boolean {
  try {
    return localStorage.getItem(TEACHING_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeTeachingMode(enabled: boolean) {
  try {
    localStorage.setItem(TEACHING_MODE_KEY, String(enabled))
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
  teachingMode: boolean
  setTeachingMode: (v: boolean) => void
}>({
  hintsEnabled: true,
  setHintsEnabled: () => {},
  include3BetPots: false,
  setInclude3BetPots: () => {},
  includeMultiway: false,
  setIncludeMultiway: () => {},
  teachingMode: false,
  setTeachingMode: () => {},
})

export function useHints() {
  return useContext(SettingsContext)
}

/** Shared by the Postflop drill's two sub-scenarios: which pot types can appear. */
export function useScenarioMix() {
  return useContext(SettingsContext)
}

/** Shared by both drills: whether to show villain's range before deciding. */
export function useTeachingMode() {
  return useContext(SettingsContext)
}
