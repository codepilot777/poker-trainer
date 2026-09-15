export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const
export const SUITS = ['s', 'h', 'd', 'c'] as const
export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]

export interface Card {
  rank: number // 2..14 (14 = Ace)
  suit: number // 0..3
}

export function rankChar(rank: number): string {
  return RANKS[rank - 2]
}

export function cardLabel(card: Card): string {
  return `${rankChar(card.rank)}${SUITS[card.suit]}`
}

export function makeDeck(): Card[] {
  const deck: Card[] = []
  for (let rank = 2; rank <= 14; rank++) {
    for (let suit = 0; suit < 4; suit++) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

export function removeCards(deck: Card[], used: Card[]): Card[] {
  return deck.filter((c) => !used.some((u) => u.rank === c.rank && u.suit === c.suit))
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Canonical 169-hand label, e.g. "AKs", "AKo", "77". High rank first. */
export function handLabel(a: Card, b: Card): string {
  const hi = Math.max(a.rank, b.rank)
  const lo = Math.min(a.rank, b.rank)
  if (hi === lo) return `${rankChar(hi)}${rankChar(lo)}`
  const suited = a.suit === b.suit
  return `${rankChar(hi)}${rankChar(lo)}${suited ? 's' : 'o'}`
}

export function drawHoleCards(deck: Card[]): [Card, Card] {
  const shuffled = shuffle(deck)
  return [shuffled[0], shuffled[1]]
}
