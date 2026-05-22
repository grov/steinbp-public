import { pb } from './pocketbase'
import type { RecordModel } from 'pocketbase'
import type { Match, Team, Tournament } from '../types/database'

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

function recordToTeam(record: RecordModel): Team {
  return {
    id: record.id,
    tournament_id: record['tournament_id'] as string,
    name: record['name'] as string,
    player1_name: record['player1_name'] as string,
    player2_name: record['player2_name'] as string,
    player1_id: (record['player1_id'] as string) || null,
    player2_id: (record['player2_id'] as string) || null,
    is_bye: record['is_bye'] as boolean,
    seed: (record['seed'] as number | null) || null,
    created: record.created,
  }
}

function recordToMatch(record: RecordModel): Match {
  return {
    id: record.id,
    tournament_id: record['tournament_id'] as string,
    group_id: (record['group_id'] as string) || null,
    table_id: (record['table_id'] as string) || null,
    phase: record['phase'] as Match['phase'],
    round: record['round'] as number,
    match_number: record['match_number'] as number,
    team1_id: (record['team1_id'] as string) || null,
    team2_id: (record['team2_id'] as string) || null,
    winner_id: (record['winner_id'] as string) || null,
    winner_cups_remaining: (record['winner_cups_remaining'] as number | null) ?? null,
    status: record['status'] as Match['status'],
    next_match_id: (record['next_match_id'] as string) || null,
    next_match_slot: ((record['next_match_slot'] as number) || null) as 1 | 2 | null,
    started_at: (record['started_at'] as string) || null,
    finished_at: (record['finished_at'] as string) || null,
    created: record.created,
  }
}

// ── Génération du bracket élimination directe ─────────────────

export async function generateSingleEliminationBracket(
  tournament: Tournament,
  teams: Team[],
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

  // ── 2. Trier par seed ────────────────────────────────────────
  allTeams.sort((a, b) => {
    if (a.seed === null && b.seed === null) return Math.random() - 0.5
    if (a.seed === null) return 1
    if (b.seed === null) return -1
    return a.seed - b.seed
  })

  // ── 3. Placer dans les slots du bracket ─────────────────────
  const positions = bracketPositions(bracketSize)
  const slottedTeams: (Team | null)[] = new Array(bracketSize).fill(null)
  for (let i = 0; i < allTeams.length; i++) {
    slottedTeams[positions[i]] = allTeams[i]
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
}

async function resolveBye(match: Match): Promise<void> {
  let winnerId: string | null = null

  if (match.team1_id) {
    const record = await pb.collection('teams').getOne(match.team1_id, { fields: 'id,is_bye', requestKey: null })
    winnerId = record['is_bye'] ? match.team2_id : match.team1_id
  } else {
    winnerId = match.team2_id
  }

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
}
