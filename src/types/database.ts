// ── Énumérations ──────────────────────────────────────────────

export type TournamentFormat = 'single_elimination' | 'group_then_elimination' | 'official'
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
  cups_to_win: number
  groups_count: number | null
  teams_advance_per_group: number | null
  created_by: string | null
  // Infos d'événement (tous formats)
  location: string
  starts_at: string | null
  rules: string
  // Tournoi officiel
  match_duration: number | null
  scoring: ScoringRules
  qualified_count: number | null
  created: string
  updated: string
}

/** Barème de points des qualifications (tournoi officiel). */
export interface ScoringRules {
  win: number
  win_time: number
  draw: number
  loss: number
}

export interface Team {
  id: string
  tournament_id: string
  name: string
  player1_name: string
  player2_name: string
  player1_id: string | null
  player2_id: string | null
  /** Duo permanent (paire de joueurs avec compte) ; null pour un invité ou un bye. */
  duo_id: string | null
  is_bye: boolean
  seed: number | null
  created: string
}

/**
 * Paire de joueurs permanente : la même équipe d'un tournoi à l'autre.
 * player1 < player2 (tri par id) pour qu'une paire n'existe qu'une fois.
 */
export interface Duo {
  id: string
  player1: string
  player2: string
  /** Dernier nom d'équipe choisi pour ce duo. */
  name: string
  /** Désignée légendaire par l'admin (sinon automatique, voir isLegendary). */
  legendary: boolean
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
  draws: number
  losses: number
  cups_for: number
  cups_against: number
  points: number
  created: string
}

export interface SpecialEvents {
  game_over: boolean
  balls_back_count: number
  island_count: number
  bounce_count: number
  trickshot_count: number
  redemption_count: number
  contre_son_camp_count: number
}

// ── Tricks attribués à un joueur ──────────────────────────────
// Un trick est réalisé par un joueur précis (parmi les 4 d'un match, ou
// les 2 d'un défi). Les invités (sans compte lié) ont player_id = null.

export type TrickType =
  | 'game_over'
  | 'balls_back'
  | 'island'
  | 'bounce'
  | 'trickshot'
  | 'redemption'
  | 'contre_son_camp'

export interface TrickEvent {
  player_id: string | null
  player_name: string
  type: TrickType
  count: number
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
  // Gobelets mis par chaque équipe (null = ancien match, voir matchCups)
  team1_cups: number | null
  team2_cups: number | null
  status: MatchStatus
  next_match_id: string | null
  next_match_slot: 1 | 2 | null
  started_at: string | null
  finished_at: string | null
  created: string
  // Règles spéciales (compteurs agrégés, dérivés de trick_events)
  game_over: boolean
  balls_back_count: number
  island_count: number
  bounce_count: number
  trickshot_count: number
  redemption_count: number
  contre_son_camp_count: number
  // Tricks attribués par joueur (source de vérité depuis la v2.1)
  trick_events: TrickEvent[]
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

// ── Défi (match hors tournoi, 1v1) ────────────────────────────

export interface Challenge {
  id: string
  player1_id: string
  player2_id: string | null
  player1_name: string
  player2_name: string
  winner_id: string | null
  winner_name: string
  /** Gobelets mis par chaque joueur (0-0 = score non saisi) */
  player1_cups: number
  player2_cups: number
  trick_events: TrickEvent[]
  created_by: string | null
  created: string
}

export interface CreateChallengePayload {
  player1_id: string
  player2_id: string | null
  player1_name: string
  player2_name: string
  winner_id: string | null
  winner_name: string
  player1_cups: number
  player2_cups: number
  trick_events: TrickEvent[]
  created_by: string
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
  /** Égalités au temps (tournoi officiel) */
  matches_drawn: number
  matches_lost: number
  win_rate: number
  tournaments_played: number
  tournaments_won: number
  challenges_played: number
  challenges_won: number
  // Règles spéciales
  game_over_count: number
  balls_back_count: number
  island_count: number
  bounce_count: number
  trickshot_count: number
  redemption_count: number
  contre_son_camp_count: number
}

// ── Payloads pour les mutations ───────────────────────────────

export interface CreateTournamentPayload {
  name: string
  format: TournamentFormat
  num_tables: number
  cups_per_side: number
  cups_to_win: number
  groups_count?: number
  teams_advance_per_group?: number
  location?: string
  starts_at?: string
  rules?: string
  match_duration?: number
  points_win?: number
  points_win_time?: number
  points_draw?: number
  points_loss?: number
  qualified_count?: number
}

export interface CreateTeamPayload {
  tournament_id: string
  name: string
  player1_name: string
  player2_name: string
  player1_id?: string | null
  player2_id?: string | null
}

/** Résultat saisi pour un match. winnerId = null : égalité au temps. */
export interface MatchResult {
  winnerId: string | null
  team1Cups: number
  team2Cups: number
}
