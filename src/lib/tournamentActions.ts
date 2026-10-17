import { pb } from './pocketbase'
import { generateSingleEliminationBracket } from './bracketGenerator'
import {
  generateGroupPhase,
  recomputeGroupStandings,
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
  MatchResult,
  MatchWithRelations,
  Team,
  Tournament,
  TrickEvent,
} from '../types/database'
import { aggregateTrickEvents } from './tricks'
import { winnerCupsRemaining } from './standings'
import {
  recordToGameTable,
  recordToMatchWithRelations,
  recordToTeam,
  recordToTournament,
} from './records'

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

export async function updateEventInfo(
  tournamentId: string,
  info: { location: string; starts_at: string; rules: string },
): Promise<void> {
  await pb.collection('tournaments').update(tournamentId, info)
}

export async function closeTournament(tournamentId: string): Promise<void> {
  await pb.collection('tournaments').update(tournamentId, { status: 'finished' })
}

export async function resetTournament(tournamentId: string): Promise<void> {
  const matches = await pb.collection('matches').getFullList({
    filter: `tournament_id = "${tournamentId}"`,
    requestKey: null,
  })
  await Promise.all(matches.map((m) => pb.collection('matches').delete(m.id)))

  const byeTeams = await pb.collection('teams').getFullList({
    filter: `tournament_id = "${tournamentId}" && is_bye = true`,
    requestKey: null,
  })
  await Promise.all(byeTeams.map((t) => pb.collection('teams').delete(t.id)))

  const standings = await pb.collection('group_standings').getFullList({
    filter: `tournament_id = "${tournamentId}"`,
    requestKey: null,
  })
  await Promise.all(standings.map((s) => pb.collection('group_standings').delete(s.id)))

  const groups = await pb.collection('groups').getFullList({
    filter: `tournament_id = "${tournamentId}"`,
    requestKey: null,
  })
  await Promise.all(groups.map((g) => pb.collection('groups').delete(g.id)))

  await pb.collection('tournaments').update(tournamentId, { status: 'registration' })
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

export async function startTournament(
  tournament: Tournament,
  options: { randomize?: boolean; teamOrder?: string[] } = {},
): Promise<void> {
  const records = await pb.collection('teams').getFullList({
    filter: `tournament_id = "${tournament.id}" && is_bye = false`,
    requestKey: null,
  })
  const teams = records.map(recordToTeam)

  if (tournament.format === 'single_elimination') {
    await generateSingleEliminationBracket(tournament, teams, options)
    await pb.collection('tournaments').update(tournament.id, { status: 'bracket_phase' })
  } else {
    // Poules classiques ou qualifications du tournoi officiel
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

function resultFields(result: MatchResult, tournament: Tournament, trickEvents: TrickEvent[]) {
  const agg = aggregateTrickEvents(trickEvents)
  return {
    winner_id: result.winnerId,
    winner_cups_remaining: winnerCupsRemaining(result, tournament.cups_per_side),
    team1_cups: result.team1Cups,
    team2_cups: result.team2Cups,
    trick_events: trickEvents,
    game_over: agg.game_over,
    balls_back_count: agg.balls_back_count,
    bounce_count: agg.bounce_count,
    trickshot_count: agg.trickshot_count,
    redemption_count: agg.redemption_count,
    contre_son_camp_count: agg.contre_son_camp_count,
  }
}

export async function finishMatch(
  match: Match,
  result: MatchResult,
  tournament: Tournament,
  trickEvents: TrickEvent[] = [],
): Promise<void> {
  if (match.phase === 'bracket' && !result.winnerId) {
    throw new Error('Un match de phase finale doit avoir un vainqueur.')
  }

  await pb.collection('matches').update(match.id, {
    ...resultFields(result, tournament, trickEvents),
    status: 'finished',
    finished_at: new Date().toISOString(),
  })

  if (match.table_id) {
    await pb.collection('game_tables').update(match.table_id, { is_available: true })
  }

  if (match.phase === 'bracket' && result.winnerId && match.next_match_id && match.next_match_slot) {
    await placeWinnerInNextMatch(result.winnerId, match.next_match_id, match.next_match_slot)
  }

  if (match.phase === 'group' && match.group_id) {
    await recomputeGroupStandings(tournament, match.group_id)
    await checkAndGenerateFinalBracket(tournament)
  }
}

export async function editMatchResult(
  match: Match,
  result: MatchResult,
  tournament: Tournament,
  trickEvents: TrickEvent[] = [],
): Promise<void> {
  if (match.phase === 'bracket' && !result.winnerId) {
    throw new Error('Un match de phase finale doit avoir un vainqueur.')
  }

  await pb.collection('matches').update(match.id, resultFields(result, tournament, trickEvents))

  const winnerChanged = result.winnerId !== match.winner_id

  if (match.phase === 'bracket' && winnerChanged && result.winnerId && match.next_match_id && match.next_match_slot) {
    const nextMatch = await pb.collection('matches').getOne(match.next_match_id, { fields: 'id,status', requestKey: null })
    if (nextMatch && nextMatch['status'] !== 'in_progress' && nextMatch['status'] !== 'finished') {
      const field = match.next_match_slot === 1 ? 'team1_id' : 'team2_id'
      await pb.collection('matches').update(match.next_match_id, { [field]: result.winnerId })
    }
  }

  if (match.phase === 'group' && match.group_id) {
    await recomputeGroupStandings(tournament, match.group_id)
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
        const teamRec = s.expand?.['team_id']
        const team: Team = teamRec
          ? recordToTeam(teamRec)
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
          draws: (s['draws'] as number) ?? 0,
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
