import { pb } from './pocketbase'
import type { AppSettings, RankTierConfig, BadgeConfig, XpWeights } from '../types/settings'
import type { PlayerStats } from '../types/database'

// ── Valeurs par défaut ────────────────────────────────────────

export const DEFAULT_RANK_TIERS: RankTierConfig[] = [
  { name: 'Recrue',     emoji: '🍺', min: 0   },
  { name: 'Gobelet I',  emoji: '🥤', min: 5   },
  { name: 'Gobelet II', emoji: '🥤', min: 10  },
  { name: 'Tankard I',  emoji: '🍻', min: 20  },
  { name: 'Tankard II', emoji: '🍻', min: 35  },
  { name: 'Stein I',    emoji: '🏆', min: 50  },
  { name: 'Stein II',   emoji: '🏆', min: 75  },
  { name: 'Maître',     emoji: '👑', min: 100 },
]

export const DEFAULT_BADGES: BadgeConfig[] = [
  { id: 'first_win',   emoji: '🏆', name: 'Conquérant',   desc: '1er tournoi gagné',    stat: 'tournaments_won',    threshold: 1  },
  { id: 'sniper',      emoji: '🎯', name: 'Sniper',        desc: '10 matchs joués',      stat: 'matches_played',     threshold: 10 },
  { id: 'veteran',     emoji: '🍺', name: 'Vétéran',       desc: '3 tournois joués',     stat: 'tournaments_played', threshold: 3  },
  { id: 'unstoppable', emoji: '💀', name: 'Inarrêtable',   desc: '5 tournois gagnés',    stat: 'tournaments_won',    threshold: 5  },
  { id: 'bouncer',     emoji: '🏓', name: 'Rebondisseur',  desc: '5 rebonds réussis',    stat: 'bounce_count',       threshold: 5  },
  { id: 'showman',     emoji: '🎪', name: 'Showman',       desc: '3 trickshots réussis', stat: 'trickshot_count',    threshold: 3  },
  { id: 'double_kill', emoji: '💥', name: 'Double Balle',  desc: '3 Game Over causés',   stat: 'game_over_count',    threshold: 3  },
]

export const DEFAULT_XP_WEIGHTS: XpWeights = {
  matches_played: 1,
  matches_won: 0,
  tournaments_won: 0,
}

export const DEFAULT_SETTINGS: AppSettings = {
  rank_tiers: DEFAULT_RANK_TIERS,
  badges: DEFAULT_BADGES,
  xp_weights: DEFAULT_XP_WEIGHTS,
}

// ── Helpers ───────────────────────────────────────────────────

/** Calcule le score XP d'un joueur selon les poids configurés */
export function computeXp(stats: PlayerStats, weights: XpWeights): number {
  return Math.round(
    stats.matches_played  * weights.matches_played +
    stats.matches_won     * weights.matches_won    +
    stats.tournaments_won * weights.tournaments_won,
  )
}

/** Détermine le rang actuel et la progression vers le suivant */
export function getRankInfo(xp: number, tiers: RankTierConfig[]) {
  const sorted = [...tiers].sort((a, b) => a.min - b.min)
  if (sorted.length === 0) return null

  let idx = 0
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (xp >= sorted[i].min) { idx = i; break }
  }
  const rank    = sorted[idx]
  const nextRank = idx < sorted.length - 1 ? sorted[idx + 1] : null
  const progress = nextRank
    ? Math.min(100, Math.round(((xp - rank.min) / (nextRank.min - rank.min)) * 100))
    : 100

  return {
    rank,
    nextRank,
    progress,
    ptsToNext: nextRank ? nextRank.min - xp : 0,
    xp,
    xpMax: nextRank?.min ?? rank.min,
  }
}

// ── Cache interne ─────────────────────────────────────────────

let _cachedRecordId: string | null = null

// ── Actions ───────────────────────────────────────────────────

export async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const records = await pb.collection('app_settings').getList(1, 1, { requestKey: 'app-settings' })
    if (records.items.length === 0) return structuredClone(DEFAULT_SETTINGS)

    const rec = records.items[0]
    _cachedRecordId = rec.id

    return {
      rank_tiers: (rec['rank_tiers'] as RankTierConfig[] | null) ?? DEFAULT_RANK_TIERS,
      badges:     (rec['badges']     as BadgeConfig[]    | null) ?? DEFAULT_BADGES,
      xp_weights: (rec['xp_weights'] as XpWeights        | null) ?? DEFAULT_XP_WEIGHTS,
    }
  } catch {
    // Collection absente ou erreur réseau → on renvoie les valeurs par défaut
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const data = {
    rank_tiers: settings.rank_tiers,
    badges:     settings.badges,
    xp_weights: settings.xp_weights,
  }

  // Cherche l'ID du record si on ne l'a pas encore
  if (!_cachedRecordId) {
    const records = await pb.collection('app_settings').getList(1, 1, { requestKey: null })
    _cachedRecordId = records.items[0]?.id ?? null
  }

  if (_cachedRecordId) {
    await pb.collection('app_settings').update(_cachedRecordId, data)
  } else {
    const rec = await pb.collection('app_settings').create(data)
    _cachedRecordId = rec.id
  }
}
