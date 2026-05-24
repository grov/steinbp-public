import { pb, fileUrl } from './pocketbase'
import type { RecordModel } from 'pocketbase'
import type { Player, PlayerStats, Tournament } from '../types/database'

export interface PlayerTournament {
  tournament: Tournament
  teamName: string
  won: boolean
}

function recordToPlayer(record: RecordModel): Player {
  return {
    id: record.id,
    username: record['username'] as string,
    display_name: record['display_name'] as string,
    avatar_url: fileUrl(record, record['avatar'] as string | null),
    status: record['status'] as Player['status'],
    role: record['role'] as Player['role'],
    created: record.created,
    updated: record.updated,
  }
}

function recordToTournament(record: RecordModel): Tournament {
  return {
    id: record.id,
    name: record['name'] as string,
    format: record['format'] as Tournament['format'],
    status: record['status'] as Tournament['status'],
    num_tables: record['num_tables'] as number,
    cups_per_side: record['cups_per_side'] as number,
    groups_count: (record['groups_count'] as number | null) || null,
    teams_advance_per_group: (record['teams_advance_per_group'] as number | null) || null,
    created_by: (record['created_by'] as string) || null,
    created: record.created,
    updated: record.updated,
  }
}

// ── Inscription ───────────────────────────────────────────────

export async function registerPlayer(
  email: string,
  password: string,
  username: string,
  displayName: string,
): Promise<void> {
  await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    username: username.trim(),
    display_name: displayName.trim(),
    status: 'pending',
    role: 'joueur',
  })
}

// ── Profil ────────────────────────────────────────────────────

export async function fetchPlayer(userId: string): Promise<Player | null> {
  try {
    const record = await pb.collection('users').getOne(userId, { requestKey: null })
    return recordToPlayer(record)
  } catch (e) {
    console.warn('[fetchPlayer] aucun profil trouvé pour', userId)
    return null
  }
}

export async function fetchPublicPlayer(playerId: string): Promise<Player | null> {
  try {
    const records = await pb.collection('users').getList(1, 1, {
      filter: `id = "${playerId}" && status = "approved"`,
      requestKey: null,
    })
    if (records.items.length === 0) return null
    return recordToPlayer(records.items[0])
  } catch {
    return null
  }
}

export async function updateProfile(
  playerId: string,
  payload: { display_name?: string; username?: string },
): Promise<void> {
  await pb.collection('users').update(playerId, payload)
}

export async function changePassword(
  playerId: string,
  oldPassword: string,
  newPassword: string,
): Promise<void> {
  await pb.collection('users').update(playerId, {
    oldPassword,
    password: newPassword,
    passwordConfirm: newPassword,
  })
}

// ── Avatar ────────────────────────────────────────────────────

export async function uploadAvatar(playerId: string, file: File): Promise<string> {
  if (file.size > 5 * 1024 * 1024) throw new Error('Image trop lourde (5 Mo max).')

  const formData = new FormData()
  formData.append('avatar', file)
  const record = await pb.collection('users').update(playerId, formData)
  const url = fileUrl(record, record['avatar'] as string)
  if (!url) throw new Error('Erreur lors de la récupération de l\'URL de l\'avatar.')
  return url
}

// ── Statistiques ──────────────────────────────────────────────

export async function fetchPlayerStats(playerId: string): Promise<PlayerStats> {
  const teams = await pb.collection('teams').getFullList({
    filter: `player1_id = "${playerId}" || player2_id = "${playerId}"`,
    fields: 'id,tournament_id',
    requestKey: null,
  })

  if (teams.length === 0) {
    return {
      matches_played: 0, matches_won: 0, win_rate: 0,
      tournaments_played: 0, tournaments_won: 0,
      game_over_count: 0, balls_back_count: 0, bounce_count: 0, trickshot_count: 0,
    }
  }

  const teamIds = teams.map((t) => t.id)
  const tournamentIds = [...new Set(teams.map((t) => t['tournament_id'] as string))]

  const teamFilter = teamIds.map((id) => `team1_id = "${id}" || team2_id = "${id}"`).join(' || ')

  const allMatches = await pb.collection('matches').getFullList({
    filter: `(${teamFilter}) && status = "finished"`,
    fields: 'id,team1_id,team2_id,winner_id,next_match_id,phase,tournament_id,status,game_over,balls_back_count,bounce_count,trickshot_count',
    requestKey: null,
  })

  const matchesPlayed = allMatches.length
  const matchesWon = allMatches.filter(
    (m) => m['winner_id'] && teamIds.includes(m['winner_id'] as string),
  ).length

  const tournamentsWon = allMatches.filter(
    (m) =>
      m['phase'] === 'bracket' &&
      !m['next_match_id'] &&
      m['winner_id'] &&
      teamIds.includes(m['winner_id'] as string),
  ).length

  const gameOverCount  = allMatches.filter((m) => m['game_over'] === true).length
  const ballsBackCount = allMatches.reduce((s, m) => s + ((m['balls_back_count'] as number) ?? 0), 0)
  const bounceCount    = allMatches.reduce((s, m) => s + ((m['bounce_count']     as number) ?? 0), 0)
  const trickshotCount = allMatches.reduce((s, m) => s + ((m['trickshot_count']  as number) ?? 0), 0)

  return {
    matches_played: matchesPlayed,
    matches_won: matchesWon,
    win_rate: matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0,
    tournaments_played: tournamentIds.length,
    tournaments_won: tournamentsWon,
    game_over_count:  gameOverCount,
    balls_back_count: ballsBackCount,
    bounce_count:     bounceCount,
    trickshot_count:  trickshotCount,
  }
}

// ── Admin : gestion des inscriptions ─────────────────────────

export async function fetchAllPlayers(): Promise<Player[]> {
  const records = await pb.collection('users').getFullList({
    sort: '-id',
    requestKey: null,
  })
  const players = records.map(recordToPlayer)
  const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 }
  return players.sort((a, b) => order[a.status] - order[b.status])
}

export async function deletePlayer(playerId: string): Promise<void> {
  await pb.collection('users').delete(playerId)
}

export async function adminUpdatePlayer(
  playerId: string,
  payload: { display_name?: string; username?: string; status?: Player['status']; role?: Player['role'] },
): Promise<Player> {
  const record = await pb.collection('users').update(playerId, payload)
  return recordToPlayer(record)
}

export async function fetchPendingPlayers(): Promise<Player[]> {
  const records = await pb.collection('users').getFullList({
    filter: 'status = "pending"',
    sort: '+id',
    requestKey: null,
  })
  return records.map(recordToPlayer)
}

export async function approvePlayer(playerId: string): Promise<void> {
  await pb.collection('users').update(playerId, { status: 'approved' })
}

export async function rejectPlayer(playerId: string): Promise<void> {
  await pb.collection('users').update(playerId, { status: 'rejected' })
}

// ── Tournois du joueur ────────────────────────────────────────

export async function fetchPlayerTournaments(playerId: string): Promise<PlayerTournament[]> {
  const teams = await pb.collection('teams').getFullList({
    filter: `player1_id = "${playerId}" || player2_id = "${playerId}"`,
    fields: 'id,name,tournament_id',
    requestKey: null,
  })

  if (teams.length === 0) return []

  const tournamentIds = [...new Set(teams.map((t) => t['tournament_id'] as string))]
  const teamIds = teams.map((t) => t.id)

  const tournamentFilter = tournamentIds.map((id) => `id = "${id}"`).join(' || ')
  const finalMatchFilter =
    `(${tournamentIds.map((id) => `tournament_id = "${id}"`).join(' || ')}) && phase = "bracket" && next_match_id = "" && status = "finished"`

  const [tournamentRecords, finalMatches] = await Promise.all([
    pb.collection('tournaments').getFullList({
      filter: tournamentFilter,
      sort: '-id',
      requestKey: null,
    }),
    pb.collection('matches').getFullList({
      filter: finalMatchFilter,
      fields: 'tournament_id,winner_id',
      requestKey: null,
    }),
  ])

  const winnerByTournament = new Map<string, string>()
  for (const m of finalMatches) {
    if (m['winner_id']) winnerByTournament.set(m['tournament_id'] as string, m['winner_id'] as string)
  }

  return tournamentRecords.map((rec) => {
    const tournament = recordToTournament(rec)
    const team = teams.find((t) => t['tournament_id'] === tournament.id)!
    const winnerId = winnerByTournament.get(tournament.id)
    const won = !!winnerId && teamIds.includes(winnerId)
    return { tournament, teamName: team['name'] as string, won }
  })
}
