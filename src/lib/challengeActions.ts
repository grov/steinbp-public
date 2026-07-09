import { pb } from './pocketbase'
import type { RecordModel } from 'pocketbase'
import type { Challenge, CreateChallengePayload, TrickEvent } from '../types/database'

function recordToChallenge(r: RecordModel): Challenge {
  return {
    id: r.id,
    player1_id: r['player1_id'] as string,
    player2_id: (r['player2_id'] as string) || null,
    player1_name: r['player1_name'] as string,
    player2_name: r['player2_name'] as string,
    winner_id: (r['winner_id'] as string) || null,
    winner_name: (r['winner_name'] as string) || '',
    trick_events: (r['trick_events'] as TrickEvent[] | null) ?? [],
    created_by: (r['created_by'] as string) || null,
    created: r.created,
  }
}

// ── Écriture ──────────────────────────────────────────────────

export async function createChallenge(payload: CreateChallengePayload): Promise<Challenge> {
  const record = await pb.collection('challenges').create(payload)
  return recordToChallenge(record)
}

export async function deleteChallenge(challengeId: string): Promise<void> {
  await pb.collection('challenges').delete(challengeId)
}

// ── Lecture ───────────────────────────────────────────────────

export async function fetchAllChallenges(): Promise<Challenge[]> {
  try {
    const records = await pb.collection('challenges').getFullList({
      sort: '-created',
      requestKey: null,
    })
    return records.map(recordToChallenge)
  } catch {
    return []
  }
}

export async function fetchPlayerChallenges(playerId: string): Promise<Challenge[]> {
  try {
    const records = await pb.collection('challenges').getFullList({
      filter: `player1_id = "${playerId}" || player2_id = "${playerId}"`,
      sort: '-created',
      requestKey: null,
    })
    return records.map(recordToChallenge)
  } catch {
    // Collection absente (migration non appliquée) ou erreur réseau
    return []
  }
}

/** Vrai si le joueur donné a gagné ce défi (par id, sinon par nom de camp). */
export function challengeWinnerIsPlayer(c: Challenge, playerId: string): boolean {
  if (c.winner_id) return c.winner_id === playerId
  // Vainqueur invité (sans compte) : on compare au nom du camp du joueur
  const myName = c.player1_id === playerId ? c.player1_name : c.player2_name
  return !!c.winner_name && c.winner_name === myName
}

// ── Classement tête-à-tête ────────────────────────────────────

export interface HeadToHead {
  opponentId: string | null
  opponentName: string
  wins: number
  losses: number
  total: number
}

/** Agrège le bilan du joueur face à chacun de ses adversaires de défi. */
export function computeHeadToHead(challenges: Challenge[], playerId: string): HeadToHead[] {
  const byOpponent = new Map<string, HeadToHead>()

  for (const c of challenges) {
    const isP1 = c.player1_id === playerId
    const opponentId = isP1 ? c.player2_id : c.player1_id
    const opponentName = isP1 ? c.player2_name : c.player1_name
    // Clé : id de l'adversaire si compte lié, sinon son nom (invité)
    const key = opponentId ?? `name:${opponentName.toLowerCase()}`

    const entry = byOpponent.get(key) ?? {
      opponentId,
      opponentName,
      wins: 0,
      losses: 0,
      total: 0,
    }

    if (challengeWinnerIsPlayer(c, playerId)) entry.wins += 1
    else entry.losses += 1
    entry.total += 1

    byOpponent.set(key, entry)
  }

  return [...byOpponent.values()].sort(
    (a, b) => b.wins - a.wins || a.losses - b.losses || b.total - a.total,
  )
}
