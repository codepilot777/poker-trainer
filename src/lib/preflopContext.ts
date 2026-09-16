import type { Card } from './cards'
import { POSITIONS, type Position } from '../data/preflopRanges'
import { STACK_DEPTH_RANGES, type StackDepth } from '../data/stackDepthRanges'
import { VS_OPEN_RANGES_BY_DEPTH } from '../data/vsOpenRanges'
import { expandRangeToCombos } from './rangeCombos'

/** Postflop decisions only make sense at depths where postflop play exists. */
export type PostflopDepth = Exclude<StackDepth, 'short'>
export const POSTFLOP_DEPTHS: PostflopDepth[] = ['deep', 'medium']

export type HeroRole = 'opener' | 'caller'
/** BB never opens, but it's always a valid (and the most common) responder. */
export type Seat = Position | 'BB'

export interface PreflopContext {
  heroRole: HeroRole
  heroPosition: Seat
  villainPosition: Seat
  heroHand: [Card, Card]
  /** Villain's range before any postflop action — narrow this further by bet size. */
  villainPreflopRange: Set<string>
}

function randomPosition(): Position {
  return POSITIONS[Math.floor(Math.random() * POSITIONS.length)]
}

function randomCombo(range: Set<string>): [Card, Card] {
  const combos = expandRangeToCombos(range, [])
  return combos[Math.floor(Math.random() * combos.length)]
}

/**
 * Builds a chip-consistent preflop line: hero either opened (villain, taken
 * to be BB — the position every one of the app's response ranges is
 * actually computed/modeled against — called or 3-bet) or called someone
 * else's open. Hero's hand is sampled from their real range for that role;
 * villain's range is their real preflop range for that spot. Both reuse the
 * exact data the Preflop drill uses, so "what
 * happened preflop" actually constrains the postflop scenario instead of
 * being disconnected from it.
 */
export function newPreflopContext(depth: PostflopDepth, forceThreeBet: boolean): PreflopContext {
  const heroRole: HeroRole = forceThreeBet ? 'opener' : Math.random() < 0.5 ? 'opener' : 'caller'

  if (heroRole === 'opener') {
    const heroPosition = randomPosition()
    const heroHand = randomCombo(STACK_DEPTH_RANGES[depth][heroPosition])
    const responses = VS_OPEN_RANGES_BY_DEPTH[depth][heroPosition]
    const villainPreflopRange = forceThreeBet ? responses.threeBet : responses.call
    return { heroRole, heroPosition, villainPosition: 'BB', heroHand, villainPreflopRange }
  }

  const villainPosition = randomPosition()
  const heroHand = randomCombo(VS_OPEN_RANGES_BY_DEPTH[depth][villainPosition].call)
  const villainPreflopRange = STACK_DEPTH_RANGES[depth][villainPosition]
  const laterPositions = POSITIONS.slice(POSITIONS.indexOf(villainPosition) + 1)
  // Hero is usually BB (the universal "last to act" responder this data models),
  // but sometimes an earlier caller for scenario variety.
  const heroPosition: Seat =
    laterPositions.length > 0 && Math.random() < 0.4
      ? laterPositions[Math.floor(Math.random() * laterPositions.length)]
      : 'BB'
  return { heroRole, heroPosition, villainPosition, heroHand, villainPreflopRange }
}

const SEAT_NAMES: Record<Seat, string> = {
  UTG: 'UTG',
  MP: 'MP',
  CO: 'CO',
  BTN: 'BTN',
  SB: 'SB',
  BB: 'BB',
}

export function seatLabel(seat: Seat): string {
  return SEAT_NAMES[seat]
}
