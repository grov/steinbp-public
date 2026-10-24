import { describe, expect, it, vi } from 'vitest'
import { computeXp } from './settingsActions'
import type { PlayerStats } from '../types/database'

vi.mock('./pocketbase', () => ({ pb: {} }))

const stats = (overrides: Partial<PlayerStats>): PlayerStats => ({
  matches_played: 0, matches_won: 0, win_rate: 0, tournaments_played: 0, tournaments_won: 0,
  challenges_played: 0, challenges_won: 0, balls_back_count: 0, island_count: 0, bounce_count: 0, trickshot_count: 0,
  game_over_count: 0, redemption_count: 0, contre_son_camp_count: 0, ...overrides,
})

const weights = { matches_played: 1, matches_won: 3, tournaments_won: 5, challenges_played: 0, challenges_won: 1 }

describe('computeXp', () => {
  it('compte les défis avec leur propre barème', () => {
    // 10 défis dont 6 gagnés : 6 XP, contre 28 avec le barème des tournois.
    expect(computeXp(stats({ challenges_played: 10, challenges_won: 6 }), weights)).toBe(6)
  })

  it('additionne tournois et défis', () => {
    const player = stats({ matches_played: 4, matches_won: 3, tournaments_won: 1, challenges_played: 2, challenges_won: 1 })
    expect(computeXp(player, weights)).toBe(4 + 9 + 5 + 1)
  })
})
