import type { PlayerStats } from './database'

// ── Rangs ─────────────────────────────────────────────────────

export interface RankTierConfig {
  name: string
  emoji: string
  min: number
}

// ── Badges ────────────────────────────────────────────────────

/** Stat utilisée comme condition de déverrouillage */
export type BadgeStat = keyof Pick<
  PlayerStats,
  | 'matches_played'
  | 'matches_won'
  | 'win_rate'
  | 'tournaments_played'
  | 'tournaments_won'
  | 'balls_back_count'
  | 'bounce_count'
  | 'trickshot_count'
  | 'game_over_count'
  | 'redemption_count'
  | 'contre_son_camp_count'
>

export interface BadgeConfig {
  id: string
  emoji: string
  name: string
  desc: string
  stat: BadgeStat
  threshold: number
}

// ── Formule XP ────────────────────────────────────────────────

export interface XpWeights {
  matches_played: number
  matches_won: number
  tournaments_won: number
}

// ── Settings globales ─────────────────────────────────────────

export interface AppSettings {
  rank_tiers: RankTierConfig[]
  badges: BadgeConfig[]
  xp_weights: XpWeights
}
