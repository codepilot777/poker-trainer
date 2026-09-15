import type { ReactNode } from 'react'
import { useHints } from '../lib/settings'

export function HintBox({ children }: { children: ReactNode }) {
  const { hintsEnabled } = useHints()
  if (!hintsEnabled) return null
  return (
    <div className="w-full max-w-md bg-sky-500/10 border border-sky-500/30 rounded-lg px-3.5 py-2.5 text-sm text-sky-200 flex gap-2 animate-fade-in">
      <span className="shrink-0">💡</span>
      <span>{children}</span>
    </div>
  )
}
