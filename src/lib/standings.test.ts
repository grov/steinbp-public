import { describe, expect, it } from 'vitest'
import type { Match } from '../types/database'
import {
  CLASSIC_SCORING,
  OFFICIAL_SCORING,
  computeStandings,
  matchCups,
  officialRulesText,
  resultFromCups,
  roundRobinRounds,
  teamOutcome,
  validateResult,
  winnerCupsRemaining,
} from './standings'

const ctx = { cups_per_side: 10, cups_to_win: 10 }

let sequence = 0
function finished(team1: string, team1Cups: number, team2: string, team2Cups: number): Match {
  sequence += 1
  const result = resultFromCups({ team1_id: team1, team2_id: team2 }, team1Cups, team2Cups)
  return {
    id: `m${sequence}`,
    tournament_id: 't',
    group_id: 'g',
    table_id: null,
    phase: 'group',
    round: 1,
    match_number: sequence,
    team1_id: team1,
    team2_id: team2,
    winner_id: result.winnerId,
    winner_cups_remaining: winnerCupsRemaining(result, 10),
    team1_cups: team1Cups,
    team2_cups: team2Cups,
    status: 'finished',
    next_match_id: null,
    next_match_slot: null,
    started_at: null,
    finished_at: null,
    created: '',
    game_over: false,
    balls_back_count: 0,
    bounce_count: 0,
    trickshot_count: 0,
    redemption_count: 0,
    contre_son_camp_count: 0,
    trick_events: [],
  }
}

describe('computeStandings — barème officiel', () => {
  // Matchs réels relevés sur une app de tournoi officiel.
  it('Tessonné : 1 victoire au temps + 1 victoire + 4 défaites = 5 pts, -9', () => {
    const matches = [
      finished('tessonne', 8, 'patricks', 6),
      finished('tessonne', 6, 'mouettes', 10),
      finished('tessonne', 7, 'holly', 9),
      finished('tessonne', 7, 'pong', 10),
      finished('tessonne', 10, 'poires', 8),
      finished('tessonne', 6, 'festiprouts', 10),
    ]
    const [row] = computeStandings(['tessonne'], matches, ctx, OFFICIAL_SCORING)
    expect(row).toMatchObject({ played: 6, wins: 2, draws: 0, losses: 4, points: 5 })
    expect(row.cups_for - row.cups_against).toBe(-9)
  })

  it('SteinTown : 3 victoires + 1 nul + 2 défaites = 10 pts, -2', () => {
    const matches = [
      finished('steintown', 10, 'confederation', 8),
      finished('steintown', 6, 'lagers', 10),
      finished('p4', 8, 'steintown', 10),
      finished('biere', 10, 'steintown', 7),
      finished('steintown', 7, 'traquenards', 7),
      finished('beauvuade', 9, 'steintown', 10),
    ]
    const [row] = computeStandings(['steintown'], matches, ctx, OFFICIAL_SCORING)
    expect(row).toMatchObject({ played: 6, wins: 3, draws: 1, losses: 2, points: 10 })
    expect(row.cups_for - row.cups_against).toBe(-2)
  })

  it('une défaite au temps ne rapporte rien', () => {
    const match = finished('tessonne', 7, 'holly', 9)
    expect(teamOutcome(match, 'holly', ctx)).toBe('win_time')
    expect(teamOutcome(match, 'tessonne', ctx)).toBe('loss')
  })

  it('départage par différence de gobelets puis gobelets mis', () => {
    const matches = [
      finished('a', 10, 'x', 2), // 3 pts, +8
      finished('b', 10, 'y', 5), // 3 pts, +5
      finished('c', 10, 'z', 0), // 3 pts, +10
      finished('d', 7, 'v', 7), // 1 pt, 0, 7 mis
      finished('e', 3, 'w', 3), // 1 pt, 0, 3 mis
    ]
    const order = computeStandings(['a', 'b', 'c', 'd', 'e'], matches, ctx, OFFICIAL_SCORING)
      .map((r) => r.team_id)
    expect(order).toEqual(['c', 'a', 'b', 'd', 'e'])
  })
})

describe('matchCups — compatibilité anciens matchs', () => {
  it('déduit le score de winner_cups_remaining quand les scores sont absents', () => {
    const legacy = { ...finished('a', 10, 'b', 7), team1_cups: 0, team2_cups: 0, winner_cups_remaining: 3 }
    expect(matchCups(legacy, ctx)).toEqual({ team1: 10, team2: 7 })
  })

  it('garde 2 points par victoire en poules classiques', () => {
    const [row] = computeStandings(['a'], [finished('a', 10, 'b', 4)], ctx, CLASSIC_SCORING)
    expect(row.points).toBe(2)
  })
})

describe('validateResult', () => {
  const match = { team1_id: 'a', team2_id: 'b' }
  const official = { ...ctx, allowTimeLimit: true }

  it('accepte une victoire normale, au temps et une égalité en qualifs', () => {
    expect(validateResult(resultFromCups(match, 10, 6), match, 'group', official)).toBeNull()
    expect(validateResult(resultFromCups(match, 8, 6), match, 'group', official)).toBeNull()
    expect(validateResult(resultFromCups(match, 7, 7), match, 'group', official)).toBeNull()
  })

  it('refuse égalité et victoire au temps en phase finale', () => {
    expect(validateResult(resultFromCups(match, 7, 7), match, 'bracket', official)).not.toBeNull()
    expect(validateResult(resultFromCups(match, 8, 6), match, 'bracket', official)).not.toBeNull()
    expect(validateResult(resultFromCups(match, 10, 6), match, 'bracket', official)).toBeNull()
  })

  it('refuse un vainqueur incohérent ou un score hors limites', () => {
    expect(validateResult({ winnerId: 'b', team1Cups: 10, team2Cups: 6 }, match, 'group', official)).not.toBeNull()
    expect(validateResult(resultFromCups(match, 11, 6), match, 'group', official)).not.toBeNull()
    expect(validateResult(resultFromCups(match, 10, 10), match, 'group', official)).not.toBeNull()
  })
})

describe('roundRobinRounds', () => {
  it.each([4, 5, 8, 11])('%i équipes : chaque paire se rencontre une seule fois', (count) => {
    const teams = Array.from({ length: count }, (_, i) => `t${i}`)
    const rounds = roundRobinRounds(teams)
    const pairs = rounds.flat().map(([a, b]) => [a, b].sort().join('-'))

    expect(new Set(pairs).size).toBe(pairs.length)
    expect(pairs.length).toBe((count * (count - 1)) / 2)

    // Une équipe joue au plus une fois par tour.
    for (const round of rounds) {
      const playing = round.flat()
      expect(new Set(playing).size).toBe(playing.length)
    }
  })
})

describe('officialRulesText', () => {
  it('reprend le barème et la durée réglés', () => {
    const text = officialRulesText({
      match_duration: 10,
      scoring: OFFICIAL_SCORING,
      qualified_count: 8,
      cups_to_win: 10,
    })
    expect(text).toContain('Un match dure 10 minutes')
    expect(text).toContain('Victoire au temps : 2 points')
    expect(text).toContain('Égalité au temps : 1 point\n')
    expect(text).toContain('Défaite : 0 point')
    expect(text).toContain('les 8 premières équipes')
  })
})
