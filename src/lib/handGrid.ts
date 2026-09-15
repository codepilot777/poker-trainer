import { RANKS } from './cards'

/** 13x13 grid rows/cols, both descending A..2, matching the standard range-chart layout. */
export const GRID_RANKS = [...RANKS].reverse() // A,K,Q,...,2

export function gridCellLabel(rowIdx: number, colIdx: number): string {
  const rowRank = GRID_RANKS[rowIdx]
  const colRank = GRID_RANKS[colIdx]
  if (rowIdx === colIdx) return `${rowRank}${colRank}`
  if (rowIdx < colIdx) return `${rowRank}${colRank}s` // upper-right triangle: suited
  return `${colRank}${rowRank}o` // lower-left triangle: offsuit
}

export function randomHandLabel(): string {
  const row = Math.floor(Math.random() * 13)
  const col = Math.floor(Math.random() * 13)
  return gridCellLabel(row, col)
}

/** Picks a uniformly random hand label weighted by combo count (pairs=6, suited=4, offsuit=12). */
export function randomHandLabelWeighted(): string {
  const roll = Math.random() * 1326 // total combos in 52-card deck
  let acc = 0
  for (let row = 0; row < 13; row++) {
    for (let col = 0; col < 13; col++) {
      const combos = row === col ? 6 : row < col ? 4 : 12
      acc += combos
      if (roll < acc) return gridCellLabel(row, col)
    }
  }
  return 'AA'
}
