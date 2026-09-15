import { RANKS } from './cards'

const RANK_INDEX: Record<string, number> = {}
RANKS.forEach((r, i) => (RANK_INDEX[r] = i)) // '2' -> 0 ... 'A' -> 12

function pairLabel(idx: number): string {
  const r = RANKS[idx]
  return `${r}${r}`
}

function suitedLabel(hiIdx: number, loIdx: number): string {
  return `${RANKS[hiIdx]}${RANKS[loIdx]}s`
}

function offsuitLabel(hiIdx: number, loIdx: number): string {
  return `${RANKS[hiIdx]}${RANKS[loIdx]}o`
}

/** Parses a single token like "77+", "66-99", "ATs+", "A5s-A2s", "AJo+", "AKo", "AA" into hand labels. */
function parseToken(token: string): string[] {
  token = token.trim()
  const out: string[] = []
  if (!token) return out

  const plusMatch = token.match(/^([2-9TJQKA])([2-9TJQKA])(s|o)?\+$/)
  const dashMatch = token.match(/^([2-9TJQKA])([2-9TJQKA])(s|o)?-([2-9TJQKA])([2-9TJQKA])(s|o)?$/)
  const exactMatch = token.match(/^([2-9TJQKA])([2-9TJQKA])(s|o)?$/)

  if (plusMatch) {
    const [, r1, r2, suitedFlag] = plusMatch
    const i1 = RANK_INDEX[r1]
    const i2 = RANK_INDEX[r2]
    if (i1 === i2) {
      // pair+, e.g. 77+
      for (let idx = i1; idx <= RANK_INDEX['A']; idx++) out.push(pairLabel(idx))
    } else {
      const hi = Math.max(i1, i2)
      const loStart = Math.min(i1, i2)
      for (let lo = loStart; lo < hi; lo++) {
        out.push(suitedFlag === 'o' ? offsuitLabel(hi, lo) : suitedLabel(hi, lo))
      }
    }
    return out
  }

  if (dashMatch) {
    const [, r1, r2, flag1, r3, r4, flag2] = dashMatch
    const suitedFlag = flag1 ?? flag2
    const iA1 = RANK_INDEX[r1]
    const iA2 = RANK_INDEX[r2]
    const iB1 = RANK_INDEX[r3]
    const iB2 = RANK_INDEX[r4]
    if (iA1 === iA2 && iB1 === iB2) {
      // pair range, e.g. 66-99
      const lo = Math.min(iA1, iB1)
      const hi = Math.max(iA1, iB1)
      for (let idx = lo; idx <= hi; idx++) out.push(pairLabel(idx))
    } else {
      // same high card, varying kicker, e.g. A5s-A2s
      const hi = Math.max(iA1, iA2)
      const loA = Math.min(iA1, iA2)
      const loB = Math.min(iB1, iB2)
      const from = Math.min(loA, loB)
      const to = Math.max(loA, loB)
      for (let lo = from; lo <= to; lo++) {
        if (lo === hi) continue
        out.push(suitedFlag === 'o' ? offsuitLabel(hi, lo) : suitedLabel(hi, lo))
      }
    }
    return out
  }

  if (exactMatch) {
    const [, r1, r2, suitedFlag] = exactMatch
    const i1 = RANK_INDEX[r1]
    const i2 = RANK_INDEX[r2]
    if (i1 === i2) {
      out.push(pairLabel(i1))
    } else {
      const hi = Math.max(i1, i2)
      const lo = Math.min(i1, i2)
      out.push(suitedFlag === 'o' ? offsuitLabel(hi, lo) : suitedLabel(hi, lo))
    }
    return out
  }

  return out
}

export function parseRange(rangeStr: string): Set<string> {
  const labels = new Set<string>()
  for (const token of rangeStr.split(',')) {
    for (const label of parseToken(token)) labels.add(label)
  }
  return labels
}
