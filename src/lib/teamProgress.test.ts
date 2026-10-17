import { describe, expect, it } from 'vitest'
import type { Match } from '../types/database'
import { teamProgress } from './teamProgress'

function bracketMatch(round: number, team1: string | null, team2: string | null, winner: string | null): Match {
  return {
    id: `r${round}-${team1}-${team2}`,
    tournament_id: 't',
    group_id: null,
    table_id: null,
    phase: 'bracket',
    round,
    match_number: 1,
    team1_id: team1,
    team2_id: team2,
    winner_id: winner,
    winner_cups_remaining: null,
    team1_cups: null,
    team2_cups: null,
    status: winner ? 'finished' : team1 && team2 ? 'ready' : 'pending',
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

const ranking = [
  { team_id: 'a', points: 18 },
  { team_id: 'b', points: 12 },
  { team_id: 'c', points: 3 },
]

describe('teamProgress', () => {
  it('pendant les qualifications : rang et points', () => {
    expect(teamProgress('b', { status: 'group_phase' }, [], ranking))
      .toEqual({ kind: 'qualifying', rank: 2, points: 12 })
  })

  it('non qualifiée une fois l\'arbre lancé', () => {
    const bracket = [bracketMatch(1, 'a', 'b', null)]
    expect(teamProgress('c', { status: 'bracket_phase' }, bracket, ranking))
      .toEqual({ kind: 'not_qualified', rank: 3 })
  })

  it('éliminée au premier tour d\'un arbre à 3 tours', () => {
    const bracket = [bracketMatch(1, 'a', 'b', 'a'), bracketMatch(2, 'a', null, null), bracketMatch(3, null, null, null)]
    expect(teamProgress('b', { status: 'bracket_phase' }, bracket, ranking))
      .toEqual({ kind: 'eliminated', round: 1, maxRound: 3 })
    expect(teamProgress('a', { status: 'bracket_phase' }, bracket, ranking))
      .toEqual({ kind: 'alive', round: 2, maxRound: 3 })
  })

  it('finaliste et championne', () => {
    const bracket = [bracketMatch(1, 'a', 'b', 'a')]
    expect(teamProgress('a', { status: 'finished' }, bracket, ranking)).toEqual({ kind: 'champion' })
    expect(teamProgress('b', { status: 'finished' }, bracket, ranking)).toEqual({ kind: 'runner_up' })
  })
})
