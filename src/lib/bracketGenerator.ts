import { pb } from './pocketbase'
import type { Match, Team, Tournament } from '../types/database'
import { recordToMatch, recordToTeam } from './records'

// ── Utilitaires mathématiques ─────────────────────────────────

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

function bracketPositions(size: number): number[] {
  if (size === 2) return [0, 1]
  const half = size / 2
  const prev = bracketPositions(half)
  const result: number[] = []
  for (const pos of prev) {
    result.push(pos)
    result.push(size - 1 - pos)
  }
  return result
}

// ── Génération du bracket élimination directe ─────────────────

export async function generateSingleEliminationBracket(
  tournament: Tournament,
  teams: Team[],
  options: { randomize?: boolean; teamOrder?: string[] } = {},
): Promise<void> {
  const realTeams = teams.filter((t) => !t.is_bye)
  const n = realTeams.length
  if (n < 2) throw new Error('Au moins 2 équipes nécessaires')

  const bracketSize = nextPow2(n)
  const numByes = bracketSize - n
  const numRounds = Math.log2(bracketSize)

  // ── 1. Créer les équipes Bye manquantes ─────────────────────
  let allTeams = [...realTeams]

  if (numByes > 0) {
    const byeInserts = Array.from({ length: numByes }, (_, i) => ({
      tournament_id: tournament.id,
      name: `Bye ${i + 1}`,
      player1_name: 'BYE',
      player2_name: '',
      is_bye: true,
      seed: n + i + 1,
    }))
    const byeTeams = await Promise.all(byeInserts.map((b) => pb.collection('teams').create(b, { requestKey: null })))
    allTeams = [...allTeams, ...byeTeams.map(recordToTeam)]
  }

  // ── 2. Ordonner les équipes ──────────────────────────────────
  if (options.teamOrder && !options.randomize) {
    const orderMap = new Map(options.teamOrder.map((id, i) => [id, i]))
    allTeams.sort((a, b) => {
      const ia = orderMap.get(a.id) ?? Infinity
      const ib = orderMap.get(b.id) ?? Infinity
      return ia - ib
    })
  } else {
    allTeams.sort((a, b) => {
      if (a.seed === null && b.seed === null) return Math.random() - 0.5
      if (a.seed === null) return 1
      if (b.seed === null) return -1
      return a.seed - b.seed
    })
  }

  // ── 3. Placer dans les slots du bracket ─────────────────────
  const slottedTeams: (Team | null)[] = new Array(bracketSize).fill(null)
  if (options.teamOrder && !options.randomize) {
    for (let i = 0; i < allTeams.length; i++) {
      slottedTeams[i] = allTeams[i]
    }
  } else {
    // positions[slot] = rang de la tête de série placée dans ce slot
    // (taille 4 : [0, 3, 1, 2] → 1 contre 4, 2 contre 3).
    const positions = bracketPositions(bracketSize)
    for (let slot = 0; slot < bracketSize; slot++) {
      slottedTeams[slot] = allTeams[positions[slot]] ?? null
    }
  }

  // ── 4. Insérer les matchs de tous les tours ─────────────────
  const insertedRounds: Match[][] = []

  const round1Records = await Promise.all(
    Array.from({ length: bracketSize / 2 }, (_, i) => {
      const team1 = slottedTeams[i * 2]
      const team2 = slottedTeams[i * 2 + 1]
      const isByeMatch = team1?.is_bye || team2?.is_bye
      return pb.collection('matches').create({
        tournament_id: tournament.id,
        phase: 'bracket',
        round: 1,
        match_number: i + 1,
        team1_id: team1?.id ?? null,
        team2_id: team2?.id ?? null,
        status: isByeMatch ? 'bye' : 'ready',
      }, { requestKey: null })
    }),
  )
  insertedRounds.push(round1Records.map(recordToMatch))

  for (let r = 2; r <= numRounds; r++) {
    const count = bracketSize / Math.pow(2, r)
    const roundRecords = await Promise.all(
      Array.from({ length: count }, (_, i) =>
        pb.collection('matches').create({
          tournament_id: tournament.id,
          phase: 'bracket',
          round: r,
          match_number: i + 1,
          team1_id: null,
          team2_id: null,
          status: 'pending',
        }, { requestKey: null }),
      ),
    )
    insertedRounds.push(roundRecords.map(recordToMatch))
  }

  // ── 5. Créer les liens next_match_id ────────────────────────
  for (let r = 0; r < insertedRounds.length - 1; r++) {
    const currentRound = insertedRounds[r]
    const nextRound = insertedRounds[r + 1]

    await Promise.all(
      currentRound.map((match, i) =>
        pb.collection('matches').update(match.id, {
          next_match_id: nextRound[Math.floor(i / 2)].id,
          next_match_slot: (i % 2) + 1,
        }, { requestKey: null }),
      ),
    )
  }

  // ── 6. Résoudre automatiquement les matchs Bye ──────────────
  if (insertedRounds.length > 1) {
    const nextRound = insertedRounds[1]
    for (let i = 0; i < insertedRounds[0].length; i++) {
      const match = insertedRounds[0][i]
      if (match.status !== 'bye') continue
      const nextMatchId = nextRound[Math.floor(i / 2)].id
      const nextMatchSlot = ((i % 2) + 1) as 1 | 2
      await resolveBye({ ...match, next_match_id: nextMatchId, next_match_slot: nextMatchSlot })
    }
  }

  // ── 7. Résoudre les byes en cascade (tours suivants) ───────
  for (let r = 1; r < insertedRounds.length; r++) {
    for (const match of insertedRounds[r]) {
      const fresh = await pb.collection('matches').getOne(match.id, { requestKey: null })
      const t1 = fresh['team1_id'] as string | null
      const t2 = fresh['team2_id'] as string | null
      if (!t1 && !t2) continue
      if (t1 && t2) continue
      const soloTeamId = t1 || t2
      if (!soloTeamId) continue
      const nextRound = insertedRounds[r + 1]
      if (!nextRound) continue
      const matchIndex = insertedRounds[r].indexOf(match)
      const nextMatchId = nextRound[Math.floor(matchIndex / 2)].id
      const nextSlot = ((matchIndex % 2) + 1) as 1 | 2
      await pb.collection('matches').update(match.id, { winner_id: soloTeamId, status: 'bye' })
      await placeWinnerInNextMatch(soloTeamId, nextMatchId, nextSlot)
    }
  }
}

async function resolveBye(match: Match): Promise<void> {
  const team1IsBye = match.team1_id
    ? (await pb.collection('teams').getOne(match.team1_id, { fields: 'id,is_bye', requestKey: null }))['is_bye'] as boolean
    : true
  const team2IsBye = match.team2_id
    ? (await pb.collection('teams').getOne(match.team2_id, { fields: 'id,is_bye', requestKey: null }))['is_bye'] as boolean
    : true

  if (team1IsBye && team2IsBye) {
    await pb.collection('matches').update(match.id, { status: 'bye', winner_id: null })
    return
  }

  const winnerId = team1IsBye ? match.team2_id : match.team1_id
  if (!winnerId || !match.next_match_id) return

  await pb.collection('matches').update(match.id, { winner_id: winnerId, status: 'bye' })
  await placeWinnerInNextMatch(winnerId, match.next_match_id, match.next_match_slot!)
}

// ── Utilitaires partagés ──────────────────────────────────────

export async function placeWinnerInNextMatch(
  winnerId: string,
  nextMatchId: string,
  slot: 1 | 2,
): Promise<void> {
  const field = slot === 1 ? 'team1_id' : 'team2_id'
  const otherField = slot === 1 ? 'team2_id' : 'team1_id'

  const nextMatch = await pb.collection('matches').getOne(nextMatchId, { requestKey: null })
  if (!nextMatch) return

  const otherTeamId = (nextMatch[otherField] as string) || null
  const update: Record<string, unknown> = { [field]: winnerId }
  if (otherTeamId) update.status = 'ready'

  await pb.collection('matches').update(nextMatchId, update)

  if (!otherTeamId) {
    const otherSlot = slot === 1 ? 2 : 1
    const sourceMatches = await pb.collection('matches').getFullList({
      filter: `next_match_id = "${nextMatchId}" && next_match_slot = ${otherSlot}`,
      requestKey: null,
    })
    const source = sourceMatches[0]
    if (source && source['status'] === 'bye' && !source['winner_id']) {
      await pb.collection('matches').update(nextMatchId, { winner_id: winnerId, status: 'bye' })
      const updatedMatch = await pb.collection('matches').getOne(nextMatchId, { requestKey: null })
      const nextNext = (updatedMatch['next_match_id'] as string) || null
      const nextSlot = (updatedMatch['next_match_slot'] as number) as 1 | 2 | null
      if (nextNext && nextSlot) {
        await placeWinnerInNextMatch(winnerId, nextNext, nextSlot)
      }
    }
  }
}
