import type { RecordModel } from 'pocketbase'
import type { GameTable, Match, MatchWithRelations, Team, Tournament, TrickEvent } from '../types/database'
import { effectiveCupsToWin } from './cupScoring'
import { CLASSIC_SCORING } from './standings'

// ── Conversion des enregistrements PocketBase ─────────────────

export function recordToTournament(r: RecordModel): Tournament {
  const format = r['format'] as Tournament['format']
  return {
    id: r.id,
    name: r['name'] as string,
    format,
    status: r['status'] as Tournament['status'],
    num_tables: r['num_tables'] as number,
    cups_per_side: r['cups_per_side'] as number,
    cups_to_win: effectiveCupsToWin(
      r['cups_per_side'] as number,
      r['cups_to_win'] as number | null,
    ),
    groups_count: (r['groups_count'] as number | null) || null,
    teams_advance_per_group: (r['teams_advance_per_group'] as number | null) || null,
    created_by: (r['created_by'] as string) || null,
    location: (r['location'] as string) || '',
    starts_at: (r['starts_at'] as string) || null,
    rules: (r['rules'] as string) || '',
    match_duration: (r['match_duration'] as number | null) || null,
    scoring: format === 'official'
      ? {
          win: (r['points_win'] as number) ?? 0,
          win_time: (r['points_win_time'] as number) ?? 0,
          draw: (r['points_draw'] as number) ?? 0,
          loss: (r['points_loss'] as number) ?? 0,
        }
      : CLASSIC_SCORING,
    qualified_count: (r['qualified_count'] as number | null) || null,
    created: r.created,
    updated: r.updated,
  }
}

/** Prénoms des joueurs d'une équipe : « Hans & Yoann ». */
export function teamPlayers(team: Pick<Team, 'player1_name' | 'player2_name'>): string {
  return [team.player1_name, team.player2_name].filter(Boolean).join(' & ')
}

export function recordToTeam(r: RecordModel): Team {
  return {
    id: r.id,
    tournament_id: r['tournament_id'] as string,
    name: r['name'] as string,
    player1_name: r['player1_name'] as string,
    player2_name: r['player2_name'] as string,
    player1_id: (r['player1_id'] as string) || null,
    player2_id: (r['player2_id'] as string) || null,
    duo_id: (r['duo_id'] as string) || null,
    is_bye: r['is_bye'] as boolean,
    seed: (r['seed'] as number | null) || null,
    created: r.created,
  }
}

export function recordToGameTable(r: RecordModel): GameTable {
  return {
    id: r.id,
    tournament_id: r['tournament_id'] as string,
    name: r['name'] as string,
    is_available: r['is_available'] as boolean,
    created: r.created,
  }
}

export function recordToMatch(r: RecordModel): Match {
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
    team1_cups: (r['team1_cups'] as number | null) ?? null,
    team2_cups: (r['team2_cups'] as number | null) ?? null,
    status: r['status'] as Match['status'],
    next_match_id: (r['next_match_id'] as string) || null,
    next_match_slot: ((r['next_match_slot'] as number) || null) as 1 | 2 | null,
    started_at: (r['started_at'] as string) || null,
    finished_at: (r['finished_at'] as string) || null,
    created: r.created,
    // Règles spéciales
    game_over: (r['game_over'] as boolean) ?? false,
    balls_back_count: (r['balls_back_count'] as number) ?? 0,
    island_count: (r['island_count'] as number) ?? 0,
    bounce_count: (r['bounce_count'] as number) ?? 0,
    trickshot_count: (r['trickshot_count'] as number) ?? 0,
    redemption_count: (r['redemption_count'] as number) ?? 0,
    contre_son_camp_count: (r['contre_son_camp_count'] as number) ?? 0,
    trick_events: (r['trick_events'] as TrickEvent[] | null) ?? [],
  }
}

export function recordToMatchWithRelations(r: RecordModel): MatchWithRelations {
  return {
    ...recordToMatch(r),
    team1: r.expand?.['team1_id'] ? recordToTeam(r.expand['team1_id'] as RecordModel) : null,
    team2: r.expand?.['team2_id'] ? recordToTeam(r.expand['team2_id'] as RecordModel) : null,
    winner: r.expand?.['winner_id'] ? recordToTeam(r.expand['winner_id'] as RecordModel) : null,
    table: r.expand?.['table_id'] ? recordToGameTable(r.expand['table_id'] as RecordModel) : null,
  }
}
