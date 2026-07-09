import type { SpecialEvents, TrickEvent, TrickType } from '../types/database'

// ── Métadonnées des tricks (source unique pour l'UI) ──────────

export interface TrickDef {
  type: TrickType
  emoji: string
  label: string
  description: string
  /** Bourde : ne rapporte pas d'XP positive, style visuel distinct */
  isBlunder?: boolean
}

export const TRICK_DEFS: TrickDef[] = [
  { type: 'game_over',       emoji: '💥', label: 'Game Over',       description: '2 balles dans le même verre' },
  { type: 'balls_back',      emoji: '🔄', label: 'Balls Back',      description: '2 balles dans des verres différents' },
  { type: 'bounce',          emoji: '🏓', label: 'Rebond',          description: 'Rebond sur la table réussi' },
  { type: 'trickshot',       emoji: '🎪', label: 'Trickshot',       description: 'Lancer spécial réussi' },
  { type: 'redemption',      emoji: '🔥', label: 'Redemption',      description: 'Dernier verre rentré pour sauver le match' },
  { type: 'contre_son_camp', emoji: '🤦', label: 'Contre son camp', description: 'Balle envoyée dans son propre camp', isBlunder: true },
]

// ── Agrégation ────────────────────────────────────────────────

/** Réduit une liste de tricks attribués en compteurs agrégés (pour
 *  rétro-compatibilité avec les champs dénormalisés du match). */
export function aggregateTrickEvents(events: TrickEvent[]): SpecialEvents {
  const agg: SpecialEvents = {
    game_over: false,
    balls_back_count: 0,
    bounce_count: 0,
    trickshot_count: 0,
    redemption_count: 0,
    contre_son_camp_count: 0,
  }
  for (const e of events) {
    if (!e || e.count <= 0) continue
    switch (e.type) {
      case 'game_over':       agg.game_over = true;                break
      case 'balls_back':      agg.balls_back_count      += e.count; break
      case 'bounce':          agg.bounce_count          += e.count; break
      case 'trickshot':       agg.trickshot_count       += e.count; break
      case 'redemption':      agg.redemption_count      += e.count; break
      case 'contre_son_camp': agg.contre_son_camp_count += e.count; break
    }
  }
  return agg
}

/** Total de tricks (hors bourdes) attribués à un joueur donné. */
export function countPlayerTricks(events: TrickEvent[], playerId: string): number {
  return events
    .filter((e) => e.player_id === playerId && e.type !== 'contre_son_camp')
    .reduce((s, e) => s + e.count, 0)
}
