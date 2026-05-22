import { pb } from './pocketbase'
import type { RecordModel } from 'pocketbase'
import { generateSingleEliminationBracket } from './bracketGenerator'
import {
  generateGroupPhase,
  updateGroupStandings,
  reverseGroupStandings,
  checkAndGenerateFinalBracket,
} from './groupPhaseGenerator'
import { placeWinnerInNextMatch } from './bracketGenerator'
import type {
  CreateTeamPayload,
  CreateTournamentPayload,
  GameTable,
  Group,
  GroupStandingWithTeam,
  GroupWithStandings,
  Match,
  MatchWithRelations,
  Team,
  Tournament,
} from '../types/database'

// ── Helpers de mapping ────────────────────────────────────────

function recordToTournament(r: RecordModel): Tournament {
  return {
    id: r.id,
    name: r['name'] as string,
    format: r['format'] as Tournament['format'],
    status: r['status'] as Tournament['status'],
    num_tables: r['num_tables'] as number,
    cups_per_side: r['cups_per_side'] as number,
    groups_count: (r['groups_count'] as number | null) || null,
    teams_advance_per_group: (r['teams_advance_per_group'] as number | null) || null,
    created_by: (r['created_by'] as string) || null,
    created: r.created,
    updated: r.updated,
  }
}

function recordToTeam(r: RecordModel): Team {
  return {
    id: r.id,
    tournament_id: r['tournament_id'] as string,
    name: r['name'] as string,
    player1_name: r['player1_name'] as string,
    player2_name: r['player2_name'] as string,
    player1_id: (r['player1_id'] as string) || null,
    player2_id: (r['player2_id'] as string) || null,
    is_bye: r['is_bye'] as boolean,
    seed: (r['seed'] as number | null) || null,
    created: r.created,
  }
}

function recordToGameTable(r: RecordModel): GameTable {
  return {
    id: r.id,
    tournament_id: r['tournament_id'] as string,
    name: r['name'] as string,
    is_available: r['is_available'] as boolean,
    created: r.created,
  }
}

function recordToMatch(r: RecordModel): Match {
  return {
    id: r.id,
    tournament_id: r['tournament_id'] as string,
    group_id: (r['group_id'] as string) || null,
    table_id: (r['table_id'] as string) || null,
    phase: r['phase'] as Match['phase'],
    round: r['round'] as number,
    match_number: r['match_number'] as number,
    team1_id: (r['team1_id'] as string) || null,
    team2_id: (r['team2_id'] as string) || null,
    winner_id: (r['winner_id'] as string) || null,
    winner_cups_remaining: (r['winner_cups_remaining'] as number | null) ?? null,
    status: r['status'] as Match['status'],
    next_match_id: (r['next_match_id'] as string) || null,
    next_match_slot: ((r['next_match_slot'] as number) || null) as 1 | 2 | null,
    started_at: (r['started_at'] as string) || null,
    finished_at: (r['finished_at'] as string) || null,
    created: r.created,
  }
}

function recordToMatchWithRelations(r: RecordModel): MatchWithRelations {
  return {
    ...recordToMatch(r),
    team1: r.expand?.['team1_id'] ? recordToTeam(r.expand['team1_id'] as RecordModel) : null,
    team2: r.expand?.['team2_id'] ? recordToTeam(r.expand['team2_id'] as RecordModel) : null,
    winner: r.expand?.['winner_id'] ? recordToTeam(r.expand['winner_id'] as RecordModel) : null,
    table: r.expand?.['table_id'] ? recordToGameTable(r.expand['table_id'] as RecordModel) : null,
  }
}

// ── Création ──────────────────────────────────────────────────

export async function createTournament(
  payload: CreateTournamentPayload,
  userId: string,
): Promise<Tournament> {
  const record = await pb.collection('tournaments').create({ ...payload, status: 'registration', created_by: userId })
  const tournament = recordToTournament(record)

  await Promise.all(
    Array.from({ length: payload.num_tables }, (_, i) =>
      pb.collection('game_tables').create({
        tournament_id: tournament.id,
        name: `Table ${i + 1}`,
        is_available: true,
      }, { requestKey: null }),
    ),
  )

  return tournament
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  try {
    await pb.collection('tournaments').delete(tournamentId)
  } catch {
    throw new Error('Suppression refusée. Vérifiez vos droits.')
  }
}

export async function closeTournament(tournamentId: string): Promise<void> {
  await pb.collection('tournaments').update(tournamentId, { status: 'finished' })
}

export async function addTeam(payload: CreateTeamPayload): Promise<Team> {
  const record = await pb.collection('teams').create(payload)
  return recordToTeam(record)
}

export async function removeTeam(teamId: string): Promise<void> {
  await pb.collection('teams').delete(teamId)
}

export async function updateTeam(
  teamId: string,
  payload: {
    name: string
    player1_name: string
    player2_name: string
    player1_id?: string | null
    player2_id?: string | null
  },
): Promise<void> {
  await pb.collection('teams').update(teamId, payload)
}

// ── Gestion des tables physiques ──────────────────────────────

export async function addTable(tournamentId: string, name: string): Promise<{ data: GameTable }> {
  const record = await pb.collection('game_tables').create({
    tournament_id: tournamentId,
    name,
    is_available: true,
  })
  return { data: recordToGameTable(record) }
}

export async function removeTable(tableId: string): Promise<void> {
  await pb.collection('game_tables').delete(tableId)
}

export async function updateTableName(tableId: string, name: string): Promise<void> {
  await pb.collection('game_tables').update(tableId, { name })
}

// ── Démarrage du tournoi ──────────────────────────────────────

export async function startTournament(tournament: Tournament): Promise<void> {
  const records = await pb.collection('teams').getFullList({
    filter: `tournament_id = "${tournament.id}" && is_bye = false`,
    requestKey: null,
  })
  const teams = records.map(recordToTeam)

  if (tournament.format === 'single_elimination') {
    await generateSingleEliminationBracket(tournament, teams)
    await pb.collection('tournaments').update(tournament.id, { status: 'bracket_phase' })
  } else {
    await generateGroupPhase(tournament, teams)
    await pb.collection('tournaments').update(tournament.id, { status: 'group_phase' })
  }
}

// ── Gestion des matchs ────────────────────────────────────────

export async function startMatch(matchId: string, tableId: string): Promise<void> {
  await pb.collection('matches').update(matchId, {
    table_id: tableId,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  })
  await pb.collection('game_tables').update(tableId, { is_available: false })
}

export async function finishMatch(
  match: Match,
  winnerId: string,
  winnerCupsRemaining: number,
  cupsPerSide: number,
): Promise<void> {
  await pb.collection('matches').update(match.id, {
    winner_id: winnerId,
    winner_cups_remaining: winnerCupsRemaining,
    status: 'finished',
    finished_at: new Date().toISOString(),
  })

  if (match.table_id) {
    await pb.collection('game_tables').update(match.table_id, { is_available: true })
  }

  if (match.phase === 'bracket' && match.next_match_id && match.next_match_slot) {
    await placeWinnerInNextMatch(winnerId, match.next_match_id, match.next_match_slot)
  }

  if (match.phase === 'group') {
    const updatedMatch = { ...match, winner_id: winnerId, winner_cups_remaining: winnerCupsRemaining }
    await updateGroupStandings(updatedMatch, cupsPerSide)

    const tournamentRecord = await pb.collection('tournaments').getOne(match.tournament_id, { requestKey: null })
    await checkAndGenerateFinalBracket(recordToTournament(tournamentRecord))
  }
}

export async function editMatchResult(
  match: Match,
  newWinnerId: string,
  newCupsRemaining: number,
  cupsPerSide: number,
): Promise<void> {
  const oldWinnerId = match.winner_id

  await pb.collection('matches').update(match.id, {
    winner_id: newWinnerId,
    winner_cups_remaining: newCupsRemaining,
  })

  const winnerChanged = newWinnerId !== oldWinnerId

  if (match.phase === 'bracket' && winnerChanged && match.next_match_id && match.next_match_slot) {
    const nextMatch = await pb.collection('matches').getOne(match.next_match_id, { fields: 'id,status', requestKey: null })
    if (nextMatch && nextMatch['status'] !== 'in_progress' && nextMatch['status'] !== 'finished') {
      const field = match.next_match_slot === 1 ? 'team1_id' : 'team2_id'
      await pb.collection('matches').update(match.next_match_id, { [field]: newWinnerId })
    }
  }

  if (match.phase === 'group' && match.group_id) {
    if (oldWinnerId && match.winner_cups_remaining !== null) {
      await reverseGroupStandings(match, cupsPerSide)
    }
    await updateGroupStandings(
      { ...match, winner_id: newWinnerId, winner_cups_remaining: newCupsRemaining },
      cupsPerSide,
    )
  }
}

export async function unassignTable(match: Match): Promise<void> {
  if (match.table_id) {
    await pb.collection('game_tables').update(match.table_id, { is_available: true })
  }
  await pb.collection('matches').update(match.id, {
    table_id: null,
    status: 'ready',
    started_at: null,
  })
}

// ── Requêtes de lecture ───────────────────────────────────────

export async function fetchMatchesWithRelations(tournamentId: string): Promise<MatchWithRelations[]> {
  const records = await pb.collection('matches').getFullList({
    filter: `tournament_id = "${tournamentId}"`,
    sort: '+round,+match_number',
    expand: 'team1_id,team2_id,winner_id,table_id',
    requestKey: null,
  })
  return records.map(recordToMatchWithRelations)
}

export async function fetchGroupsWithStandings(tournamentId: string): Promise<GroupWithStandings[]> {
  const [groupRecords, standingRecords, allMatches] = await Promise.all([
    pb.collection('groups').getFullList({
      filter: `tournament_id = "${tournamentId}"`,
      sort: '+id',
      requestKey: null,
    }),
    pb.collection('group_standings').getFullList({
      filter: `tournament_id = "${tournamentId}"`,
      expand: 'team_id',
      requestKey: null,
    }),
    fetchMatchesWithRelations(tournamentId),
  ])

  return groupRecords.map((groupRec) => {
    const group: Group = {
      id: groupRec.id,
      tournament_id: groupRec['tournament_id'] as string,
      name: groupRec['name'] as string,
      created: groupRec.created,
    }

    const standings: GroupStandingWithTeam[] = standingRecords
      .filter((s) => s['group_id'] === group.id)
      .map((s) => {
        const teamRec = s.expand?.['team_id'] as RecordModel | undefined
        const team: Team = teamRec
          ? {
              id: teamRec.id,
              tournament_id: teamRec['tournament_id'] as string,
              name: teamRec['name'] as string,
              player1_name: teamRec['player1_name'] as string,
              player2_name: teamRec['player2_name'] as string,
              player1_id: (teamRec['player1_id'] as string) || null,
              player2_id: (teamRec['player2_id'] as string) || null,
              is_bye: teamRec['is_bye'] as boolean,
              seed: (teamRec['seed'] as number | null) || null,
              created: teamRec.created,
            }
          : {
              id: s['team_id'] as string,
              tournament_id: tournamentId,
              name: '',
              player1_name: '',
              player2_name: '',
              player1_id: null,
              player2_id: null,
              is_bye: false,
              seed: null,
              created: '',
            }
        return {
          id: s.id,
          tournament_id: s['tournament_id'] as string,
          group_id: s['group_id'] as string,
          team_id: s['team_id'] as string,
          played: s['played'] as number,
          wins: s['wins'] as number,
          losses: s['losses'] as number,
          cups_for: s['cups_for'] as number,
          cups_against: s['cups_against'] as number,
          points: s['points'] as number,
          created: s.created,
          team,
        }
      })

    const matches = allMatches.filter((m) => m.group_id === group.id)

    return { ...group, standings, matches }
  })
}

// ── Ré-exports pour les helpers de mapping (utilisés dans useTournament) ──

export { recordToTournament, recordToTeam, recordToGameTable, recordToMatchWithRelations }
