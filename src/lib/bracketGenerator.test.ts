import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Team, Tournament } from '../types/database'

const pocketBase = vi.hoisted(() => {
  type StoredRecord = Record<string, unknown> & { id: string; created: string; updated: string }

  const records: Record<string, StoredRecord[]> = {
    teams: [],
    matches: [],
  }
  let sequence = 0

  function reset(teams: StoredRecord[]) {
    records.teams = teams.map((team) => ({ ...team }))
    records.matches = []
    sequence = 0
  }

  function collection(name: string) {
    const store = records[name] ?? (records[name] = [])

    return {
      async create(payload: Record<string, unknown>) {
        sequence += 1
        const record: StoredRecord = {
          ...payload,
          id: `${name}-${sequence}`,
          created: '2026-01-01T00:00:00.000Z',
          updated: '2026-01-01T00:00:00.000Z',
        }
        store.push(record)
        return { ...record }
      },

      async update(id: string, payload: Record<string, unknown>) {
        const record = store.find((item) => item.id === id)
        if (!record) throw new Error(`Missing ${name}/${id}`)
        Object.assign(record, payload)
        return { ...record }
      },

      async getOne(id: string) {
        const record = store.find((item) => item.id === id)
        if (!record) throw new Error(`Missing ${name}/${id}`)
        return { ...record }
      },

      async getFullList(options: { filter?: string } = {}) {
        let result = [...store]
        const filter = options.filter ?? ''

        const nextMatchId = filter.match(/next_match_id = "([^"]+)"/)?.[1]
        if (nextMatchId) {
          result = result.filter((item) => item.next_match_id === nextMatchId)
        }

        const nextMatchSlot = filter.match(/next_match_slot = (\d+)/)?.[1]
        if (nextMatchSlot) {
          result = result.filter((item) => item.next_match_slot === Number(nextMatchSlot))
        }

        return result.map((item) => ({ ...item }))
      },
    }
  }

  return {
    pb: { collection },
    records,
    reset,
  }
})

vi.mock('./pocketbase', () => ({ pb: pocketBase.pb }))

import { generateSingleEliminationBracket } from './bracketGenerator'

const tournament: Tournament = {
  id: 'tournament-1',
  name: 'Tournoi test',
  format: 'single_elimination',
  status: 'registration',
  num_tables: 2,
  cups_per_side: 10,
  groups_count: null,
  teams_advance_per_group: null,
  created_by: 'admin-1',
  created: '2026-01-01T00:00:00.000Z',
  updated: '2026-01-01T00:00:00.000Z',
}

function makeTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    tournament_id: tournament.id,
    name: `Équipe ${index + 1}`,
    player1_name: `Joueur ${index * 2 + 1}`,
    player2_name: `Joueur ${index * 2 + 2}`,
    player1_id: null,
    player2_id: null,
    is_bye: false,
    seed: index + 1,
    created: '2026-01-01T00:00:00.000Z',
  }))
}

function storedTeams(teams: Team[]) {
  return teams.map((team) => ({
    ...team,
    updated: '2026-01-01T00:00:00.000Z',
  }))
}

function matchesInRound(round: number) {
  return pocketBase.records.matches
    .filter((match) => match.round === round)
    .sort((a, b) => Number(a.match_number) - Number(b.match_number))
}

describe('generateSingleEliminationBracket', () => {
  beforeEach(() => pocketBase.reset([]))

  it('respecte strictement les paires 1–2, 3–4 et 5–6 en mode manuel', async () => {
    const teams = makeTeams(6)
    pocketBase.reset(storedTeams(teams))

    await generateSingleEliminationBracket(tournament, teams, {
      randomize: false,
      teamOrder: teams.map((team) => team.id),
    })

    const firstRound = matchesInRound(1)
    expect(firstRound.slice(0, 3).map((match) => [match.team1_id, match.team2_id])).toEqual([
      ['team-1', 'team-2'],
      ['team-3', 'team-4'],
      ['team-5', 'team-6'],
    ])
  })

  it.each([3, 5, 6, 7])('crée un bracket complet pour %i équipes', async (count) => {
    const teams = makeTeams(count)
    pocketBase.reset(storedTeams(teams))

    await generateSingleEliminationBracket(tournament, teams, {
      randomize: false,
      teamOrder: teams.map((team) => team.id),
    })

    const bracketSize = 2 ** Math.ceil(Math.log2(count))
    expect(pocketBase.records.matches).toHaveLength(bracketSize - 1)
    expect(matchesInRound(1)).toHaveLength(bracketSize / 2)
    expect(pocketBase.records.teams.filter((team) => team.is_bye)).toHaveLength(bracketSize - count)
  })

  it('fait avancer automatiquement une équipe opposée à une branche BYE/BYE', async () => {
    const teams = makeTeams(5)
    pocketBase.reset(storedTeams(teams))

    await generateSingleEliminationBracket(tournament, teams, {
      randomize: false,
      teamOrder: teams.map((team) => team.id),
    })

    const firstRound = matchesInRound(1)
    const semiFinals = matchesInRound(2)
    const final = matchesInRound(3)[0]

    expect(firstRound[2]).toMatchObject({ winner_id: 'team-5', status: 'bye' })
    expect(firstRound[3]).toMatchObject({ winner_id: null, status: 'bye' })
    expect(semiFinals[1]).toMatchObject({ winner_id: 'team-5', status: 'bye' })
    expect(final.team2_id).toBe('team-5')
  })
})
