export type ModuleId = 'preflop' | 'facingraise' | 'potodds' | 'postflop' | 'betsizing'

export interface Attempt {
  ts: number
  module: ModuleId
  moduleLabel: string
  correct: boolean
  /** Bucket for aggregate accuracy, e.g. position, tier, or question type. */
  group: string
  /** One-line human-readable summary, shown in the mistakes list. */
  detail: string
}

const STORAGE_KEY = 'poker-trainer-progress-v1'
const MAX_ATTEMPTS = 1000

function readAll(): Attempt[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(attempts: Attempt[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts.slice(-MAX_ATTEMPTS)))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently.
  }
}

export function recordAttempt(entry: Omit<Attempt, 'ts'>) {
  const attempts = readAll()
  attempts.push({ ...entry, ts: Date.now() })
  writeAll(attempts)
}

export function getAttempts(): Attempt[] {
  return readAll()
}

export function clearProgress() {
  writeAll([])
}

export interface GroupStats {
  group: string
  total: number
  correct: number
}

export interface ModuleStats {
  module: ModuleId
  moduleLabel: string
  total: number
  correct: number
  groups: GroupStats[]
}

export interface ProgressSummary {
  total: number
  correct: number
  byModule: ModuleStats[]
  recentMistakes: Attempt[]
}

export function summarize(attempts: Attempt[]): ProgressSummary {
  const moduleMap = new Map<ModuleId, ModuleStats>()

  for (const a of attempts) {
    let m = moduleMap.get(a.module)
    if (!m) {
      m = { module: a.module, moduleLabel: a.moduleLabel, total: 0, correct: 0, groups: [] }
      moduleMap.set(a.module, m)
    }
    m.total++
    if (a.correct) m.correct++

    let g = m.groups.find((g) => g.group === a.group)
    if (!g) {
      g = { group: a.group, total: 0, correct: 0 }
      m.groups.push(g)
    }
    g.total++
    if (a.correct) g.correct++
  }

  const recentMistakes = attempts
    .filter((a) => !a.correct)
    .slice()
    .reverse()
    .slice(0, 10)

  return {
    total: attempts.length,
    correct: attempts.filter((a) => a.correct).length,
    byModule: [...moduleMap.values()],
    recentMistakes,
  }
}
