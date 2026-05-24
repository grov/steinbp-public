// ── Énumérations ──────────────────────────────────────────────

export type TournamentFormat = 'single_elimination' | 'group_then_elimination'
export type TournamentStatus = 'registration' | 'group_phase' | 'bracket_phase' | 'finished'
export type MatchStatus = 'pending' | 'ready' | 'in_progress' | 'finished' | 'bye'
export type MatchPhase = 'group' | 'bracket'

// ── Entités DB (mirror du schéma PocketBase) ──────────────────
// PocketBase utilise `created` et `updated` (pas created_at/updated_at)

export interface Tournament {
  id: string
  name: string
  format: TournamentFormat
  status: TournamentStatus
  num_tables: number
  cups_per_side: number
  groups_count: number | null
  teams_advance_per_group: number | null
  created_by: string | null
  created: string
  updated: string
}

export interface Team {
  id: string
  tournament_id: string
  name: string
  player1_name: string
  player2_name: string
  player1_id: string | null
  player2_id: string | null
  is_bye: boolean
  seed: number | null
  created: string
}

export interface GameTable {
  id: string
  tournament_id: string
  name: string
  is_available: boolean
  created: string
}

export interface Group {
  id: string
  tournament_id: string
  name: string
  created: string
}

export interface GroupStanding {
  id: string
  tournament_id: string
  group_id: string
  team_id: string
  played: number
  wins: number
  losses: number
  cups_for: number
  cups_against: number
  points: number
  created: string
}

export interface SpecialEvents {
  game_over: boolean
  balls_back_count: number
  bounce_count: number
  trickshot_count: number
}

export interface Match {
  id: string
  tournament_id: string
  group_id: string | null
  table_id: string | null
  phase: MatchPhase
  round: number
  match_number: number
  team1_id: string | null
  team2_id: string | null
  winner_id: string | null
  winner_cups_remaining: number | null
  status: MatchStatus
  next_match_id: string | null
  next_match_slot: 1 | 2 | null
  started_at: string | null
  finished_at: string | null
  created: string
  // Règles spéciales
  game_over: boolean
  balls_back_count: number
  bounce_count: number
  trickshot_count: number
}

// ── Types enrichis (avec relations jointes) ───────────────────

export interface MatchWithRelations extends Match {
  team1: Team | null
  team2: Team | null
  winner: Team | null
  table: GameTable | null
}

export interface GroupStandingWithTeam extends GroupStanding {
  team: Team
}

export interface GroupWithStandings extends Group {
  standings: GroupStandingWithTeam[]
  matches: MatchWithRelations[]
}

export type PlayerStatus = 'pending' | 'approved' | 'rejected'
export type PlayerRole = 'admin' | 'organisateur' | 'joueur'

export interface Player {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  status: PlayerStatus
  role: PlayerRole
  created: string
  updated: string
}

export interface PlayerStats {
  matches_played: number
  matches_won: number
  win_rate: number
  tournaments_played: number
  tournaments_won: number
}

// ── Payloads pour les mutations ───────────────────────────────

export interface CreateTournamentPayload {
  name: string
  format: TournamentFormat
  num_tables: number
  cups_per_side: number
  groups_count?: number
  teams_advance_per_group?: number
}

export interface CreateTeamPayload {
  tournament_id: string
  name: string
  player1_name: string
  player2_name: string
  player1_id?: string | null
  player2_id?: string | null
}

export interface ScorePayload {
  winner_id: string
  winner_cups_remaining: number
  special_events?: Partial<SpecialEvents>
}
