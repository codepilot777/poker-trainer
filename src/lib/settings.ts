import { createContext, useContext } from 'react'

const HINTS_KEY = 'poker-trainer-hints-enabled'

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

export const SettingsContext = createContext<{
  hintsEnabled: boolean
  setHintsEnabled: (v: boolean) => void
}>({
  hintsEnabled: true,
  setHintsEnabled: () => {},
})

export function useHints() {
  return useContext(SettingsContext)
}
