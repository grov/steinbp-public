import { describe, expect, it, vi } from 'vitest'
import { LEGENDARY_TOURNAMENTS, duoPair, isLegendary } from './duos'

vi.mock('./pocketbase', () => ({ pb: {}, fileUrl: () => null }))

describe('duoPair', () => {
  it("donne la même paire quel que soit l'ordre d'inscription", () => {
    expect(duoPair('b', 'a')).toEqual(['a', 'b'])
    expect(duoPair('a', 'b')).toEqual(['a', 'b'])
  })
})

describe('isLegendary', () => {
  it('devient automatique au-delà du seuil de tournois', () => {
    expect(isLegendary({ legendary: false }, LEGENDARY_TOURNAMENTS - 1)).toBe(false)
    expect(isLegendary({ legendary: false }, LEGENDARY_TOURNAMENTS)).toBe(true)
  })

  it("peut être décerné par l'admin avant le seuil", () => {
    expect(isLegendary({ legendary: true }, 0)).toBe(true)
  })
})
