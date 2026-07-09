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
  // ── Matchs joués ─────────────────────────────────────────────
  { id: 'sniper',        emoji: '🎯', name: 'Sniper',            desc: '10 matchs joués',        stat: 'matches_played',     threshold: 10  },
  { id: 'regular',       emoji: '🎮', name: 'Habitué',           desc: '25 matchs joués',        stat: 'matches_played',     threshold: 25  },
  { id: 'warrior',       emoji: '⚔️',  name: 'Guerrier',          desc: '50 matchs joués',        stat: 'matches_played',     threshold: 50  },
  { id: 'legend',        emoji: '🌟', name: 'Légende',           desc: '100 matchs joués',       stat: 'matches_played',     threshold: 100 },

  // ── Matchs gagnés ────────────────────────────────────────────
  { id: 'winner',        emoji: '🥇', name: 'Vainqueur',         desc: '5 matchs gagnés',        stat: 'matches_won',        threshold: 5   },
  { id: 'dominant',      emoji: '💪', name: 'Dominant',          desc: '15 matchs gagnés',       stat: 'matches_won',        threshold: 15  },
  { id: 'table_king',    emoji: '👑', name: 'Roi de la table',   desc: '30 matchs gagnés',       stat: 'matches_won',        threshold: 30  },

  // ── Win rate ─────────────────────────────────────────────────
  { id: 'tactician',     emoji: '🎲', name: 'Tacticien',         desc: '50% de win rate',        stat: 'win_rate',           threshold: 50  },
  { id: 'relentless',    emoji: '⚡', name: 'Implacable',        desc: '70% de win rate',        stat: 'win_rate',           threshold: 70  },
  { id: 'prophet',       emoji: '🔮', name: 'Prophète',          desc: '90% de win rate',        stat: 'win_rate',           threshold: 90  },

  // ── Tournois joués ───────────────────────────────────────────
  { id: 'veteran',       emoji: '🍺', name: 'Vétéran',           desc: '3 tournois joués',       stat: 'tournaments_played', threshold: 3   },
  { id: 'competitor',    emoji: '🎖️', name: 'Compétiteur',       desc: '6 tournois joués',       stat: 'tournaments_played', threshold: 6   },
  { id: 'pro',           emoji: '🌍', name: 'Pro',               desc: '10 tournois joués',      stat: 'tournaments_played', threshold: 10  },

  // ── Tournois gagnés ──────────────────────────────────────────
  { id: 'first_win',     emoji: '🏆', name: 'Conquérant',        desc: '1er tournoi gagné',      stat: 'tournaments_won',    threshold: 1   },
  { id: 'unstoppable',   emoji: '💀', name: 'Inarrêtable',       desc: '5 tournois gagnés',      stat: 'tournaments_won',    threshold: 5   },

  // ── Balls Back ───────────────────────────────────────────────
  { id: 'boomerang',     emoji: '🔄', name: 'Boomerang',         desc: '1ère Balls Back',        stat: 'balls_back_count',   threshold: 1   },
  { id: 'comeback',      emoji: '🌀', name: 'Retour de flamme',  desc: '5 Balls Back',           stat: 'balls_back_count',   threshold: 5   },
  { id: 'magnet',        emoji: '🧲', name: 'Maître du retour',  desc: '15 Balls Back',          stat: 'balls_back_count',   threshold: 15  },

  // ── Rebonds ──────────────────────────────────────────────────
  { id: 'bouncer',       emoji: '🏓', name: 'Rebondisseur',      desc: '5 rebonds réussis',      stat: 'bounce_count',       threshold: 5   },
  { id: 'kangaroo',      emoji: '🦘', name: 'Kangourou',         desc: '15 rebonds réussis',     stat: 'bounce_count',       threshold: 15  },
  { id: 'maestro',       emoji: '🎯', name: 'Maestro',           desc: '30 rebonds réussis',     stat: 'bounce_count',       threshold: 30  },

  // ── Trickshots ───────────────────────────────────────────────
  { id: 'showman',       emoji: '🎪', name: 'Showman',           desc: '3 trickshots réussis',   stat: 'trickshot_count',    threshold: 3   },
  { id: 'acrobat',       emoji: '🤹', name: 'Acrobate',          desc: '8 trickshots réussis',   stat: 'trickshot_count',    threshold: 8   },
  { id: 'magician',      emoji: '🎩', name: 'Magicien',          desc: '20 trickshots réussis',  stat: 'trickshot_count',    threshold: 20  },

  // ── Game Over ────────────────────────────────────────────────
  { id: 'double_kill',   emoji: '💥', name: 'Double Balle',      desc: '3 Game Over causés',     stat: 'game_over_count',    threshold: 3   },
  { id: 'destroyer',     emoji: '💣', name: 'Destructeur',       desc: '8 Game Over causés',     stat: 'game_over_count',    threshold: 8   },
  { id: 'terminator',    emoji: '☠️',  name: 'Terminator',        desc: '20 Game Over causés',    stat: 'game_over_count',    threshold: 20  },

  // ── Redemption ───────────────────────────────────────────────
  { id: 'phoenix',       emoji: '🔥', name: 'Phénix',            desc: '1ère Redemption',        stat: 'redemption_count',   threshold: 1   },
  { id: 'survivor',      emoji: '🛡️',  name: 'Survivant',         desc: '5 Redemptions',          stat: 'redemption_count',   threshold: 5   },
  { id: 'immortal',      emoji: '💫', name: 'Immortel',          desc: '15 Redemptions',         stat: 'redemption_count',   threshold: 15  },

  // ── Contre son camp (bourdes) ────────────────────────────────
  { id: 'clumsy',        emoji: '🤦', name: 'Boulet',            desc: '1 contre son camp',      stat: 'contre_son_camp_count', threshold: 1 },
  { id: 'saboteur',      emoji: '🃏', name: 'Saboteur',          desc: '5 contres son camp',     stat: 'contre_son_camp_count', threshold: 5 },
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

/** Calcule le score XP d'un joueur selon les poids configurés.
 *  Les défis rapportent de l'XP au même titre que les matchs de tournoi
 *  (un défi joué/gagné compte comme un match joué/gagné). */
export function computeXp(stats: PlayerStats, weights: XpWeights): number {
  const played = stats.matches_played + stats.challenges_played
  const won    = stats.matches_won    + stats.challenges_won
  return Math.round(
    played                * weights.matches_played +
    won                   * weights.matches_won    +
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
