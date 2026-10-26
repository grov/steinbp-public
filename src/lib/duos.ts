import { pb, fileUrl } from './pocketbase'
import type { RecordModel } from 'pocketbase'
import type { Duo, Tournament } from '../types/database'
import { recordToMatch, recordToTournament } from './records'
import { matchCups } from './standings'

/** Nombre de tournois joués ensemble pour devenir « Équipe légendaire ». */
export const LEGENDARY_TOURNAMENTS = 5

export function recordToDuo(r: RecordModel): Duo {
  return {
    id: r.id,
    player1: r['player1'] as string,
    player2: r['player2'] as string,
    name: r['name'] as string,
    legendary: !!r['legendary'],
    created: r.created,
  }
}

/** Paire triée : un duo n'existe qu'une fois, quel que soit l'ordre d'inscription. */
export function duoPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

export function isLegendary(duo: Pick<Duo, 'legendary'>, tournamentsPlayed: number): boolean {
  return duo.legendary || tournamentsPlayed >= LEGENDARY_TOURNAMENTS
}

export async function findDuo(a: string, b: string): Promise<Duo | null> {
  if (!a || !b || a === b) return null
  const [player1, player2] = duoPair(a, b)
  try {
    const record = await pb.collection('duos').getFirstListItem(
      pb.filter('player1 = {:player1} && player2 = {:player2}', { player1, player2 }),
      { requestKey: null },
    )
    return recordToDuo(record)
  } catch {
    return null
  }
}

/**
 * Retrouve ou crée le duo d'une équipe et lui donne le nom choisi pour ce
 * tournoi. Renvoie null si l'un des joueurs n'a pas de compte.
 */
export async function linkDuo(player1Id: string | null | undefined, player2Id: string | null | undefined, name: string): Promise<string | null> {
  if (!player1Id || !player2Id || player1Id === player2Id) return null

  const existing = await findDuo(player1Id, player2Id)
  if (existing) {
    if (existing.name !== name) await pb.collection('duos').update(existing.id, { name }, { requestKey: null })
    return existing.id
  }

  const [player1, player2] = duoPair(player1Id, player2Id)
  try {
    const record = await pb.collection('duos').create({ player1, player2, name }, { requestKey: null })
    return record.id
  } catch (e) {
    // Création concurrente (index unique) : on reprend le duo existant.
    const duo = await findDuo(player1Id, player2Id)
    if (duo) return duo.id
    throw e
  }
}

export async function renameDuo(duoId: string, name: string): Promise<void> {
  await pb.collection('duos').update(duoId, { name: name.trim() })
}

export async function setDuoLegendary(duoId: string, legendary: boolean): Promise<void> {
  await pb.collection('duos').update(duoId, { legendary })
}

// ── Fiche équipe ──────────────────────────────────────────────

export interface DuoPlayer {
  id: string
  display_name: string
  avatar_url: string | null
}

export interface DuoTournament {
  tournament: Tournament
  teamName: string
  won: boolean
}

export interface DuoRival {
  name: string
  played: number
  won: number
}

export interface DuoProfile {
  duo: Duo
  players: DuoPlayer[]
  tournaments: DuoTournament[]
  stats: {
    tournaments_played: number
    tournaments_won: number
    matches_played: number
    matches_won: number
    matches_drawn: number
    matches_lost: number
    cups_for: number
    cups_against: number
  }
  /** Adversaires les plus affrontés, du plus fréquent au moins fréquent. */
  rivals: DuoRival[]
}

export async function fetchDuoProfile(duoId: string): Promise<DuoProfile | null> {
  let duo: Duo
  try {
    duo = recordToDuo(await pb.collection('duos').getOne(duoId, { requestKey: null }))
  } catch {
    return null
  }

  const [playerRecords, teamRecords] = await Promise.all([
    pb.collection('users').getFullList({
      filter: pb.filter('id = {:a} || id = {:b}', { a: duo.player1, b: duo.player2 }),
      fields: 'id,display_name,avatar,collectionId,collectionName',
      requestKey: null,
    }),
    pb.collection('teams').getFullList({
      filter: pb.filter('duo_id = {:id}', { id: duoId }),
      fields: 'id,name,tournament_id',
      requestKey: null,
    }),
  ])

  const players = [duo.player1, duo.player2].map((id) => {
    const r = playerRecords.find((p) => p.id === id)
    return {
      id,
      display_name: r ? (r['display_name'] as string) : '—',
      avatar_url: r ? fileUrl(r, r['avatar'] as string | null) : null,
    }
  })

  const empty: DuoProfile = {
    duo, players, tournaments: [], rivals: [],
    stats: { tournaments_played: 0, tournaments_won: 0, matches_played: 0, matches_won: 0, matches_drawn: 0, matches_lost: 0, cups_for: 0, cups_against: 0 },
  }
  if (teamRecords.length === 0) return empty

  const teamIds = new Set(teamRecords.map((t) => t.id))
  const tournamentIds = [...new Set(teamRecords.map((t) => t['tournament_id'] as string))]
  const byId = (field: string, ids: Iterable<string>) =>
    [...ids].map((id) => pb.filter(`${field} = {:id}`, { id })).join(' || ')

  const [tournamentRecords, matchRecords] = await Promise.all([
    pb.collection('tournaments').getFullList({ filter: byId('id', tournamentIds), requestKey: null }),
    pb.collection('matches').getFullList({
      filter: `(${[...teamIds].map((id) => pb.filter('team1_id = {:id} || team2_id = {:id}', { id })).join(' || ')}) && status = "finished"`,
      expand: 'team1_id,team2_id',
      requestKey: null,
    }),
  ])

  const tournamentsById = new Map(tournamentRecords.map((r) => [r.id, recordToTournament(r)]))
  const stats = { ...empty.stats, tournaments_played: tournamentIds.length }
  const wonTournaments = new Set<string>()
  const rivals = new Map<string, DuoRival>()

  for (const record of matchRecords) {
    const match = recordToMatch(record)
    const isTeam1 = teamIds.has(match.team1_id ?? '')
    const opponentRecord = record.expand?.[isTeam1 ? 'team2_id' : 'team1_id'] as RecordModel | undefined
    if (!opponentRecord || opponentRecord['is_bye']) continue

    const won = !!match.winner_id && teamIds.has(match.winner_id)
    stats.matches_played++
    if (won) stats.matches_won++
    else if (!match.winner_id) stats.matches_drawn++
    else stats.matches_lost++

    const tournament = tournamentsById.get(match.tournament_id)
    const cups = tournament ? matchCups(match, tournament) : null
    if (cups) {
      stats.cups_for += isTeam1 ? cups.team1 : cups.team2
      stats.cups_against += isTeam1 ? cups.team2 : cups.team1
    }

    if (won && match.phase === 'bracket' && !match.next_match_id) wonTournaments.add(match.tournament_id)

    // Un adversaire avec un duo est reconnu d'un tournoi à l'autre.
    const rivalKey = (opponentRecord['duo_id'] as string) || `team:${opponentRecord.id}`
    const rival = rivals.get(rivalKey) ?? { name: opponentRecord['name'] as string, played: 0, won: 0 }
    rival.played++
    if (won) rival.won++
    rivals.set(rivalKey, rival)
  }
  stats.tournaments_won = wonTournaments.size

  // Les tournois n'ont pas de date de création : plus récents d'abord quand
  // la date de l'événement est renseignée.
  const sortedRecords = [...tournamentRecords].sort((x, y) =>
    ((y['starts_at'] as string) || '').localeCompare((x['starts_at'] as string) || ''))
  const tournaments = sortedRecords.map((r) => ({
    tournament: tournamentsById.get(r.id)!,
    teamName: teamRecords.find((t) => t['tournament_id'] === r.id)?.['name'] as string,
    won: wonTournaments.has(r.id),
  }))

  return {
    duo,
    players,
    tournaments,
    stats,
    rivals: [...rivals.values()].sort((a, b) => b.played - a.played || a.name.localeCompare(b.name)),
  }
}

// ── Équipes d'un joueur ───────────────────────────────────────

export interface PlayerDuo {
  duo: Duo
  partnerId: string
  partnerName: string
  tournamentsPlayed: number
  legendary: boolean
}

/** Duos d'un joueur, du plus fidèle au plus ponctuel. */
export async function fetchPlayerDuos(playerId: string): Promise<PlayerDuo[]> {
  const duoRecords = await pb.collection('duos').getFullList({
    filter: pb.filter('player1 = {:id} || player2 = {:id}', { id: playerId }),
    requestKey: null,
  })
  if (duoRecords.length === 0) return []

  const partnerIds = duoRecords.map((d) => (d['player1'] === playerId ? d['player2'] : d['player1']) as string)
  const [teams, partners] = await Promise.all([
    pb.collection('teams').getFullList({
      filter: duoRecords.map((d) => pb.filter('duo_id = {:id}', { id: d.id })).join(' || '),
      fields: 'duo_id,tournament_id',
      requestKey: null,
    }),
    pb.collection('users').getFullList({
      filter: partnerIds.map((id) => pb.filter('id = {:id}', { id })).join(' || '),
      fields: 'id,display_name',
      requestKey: null,
    }),
  ])
  const partnerNames = new Map(partners.map((p) => [p.id, p['display_name'] as string]))
  const tournamentsByDuo = new Map<string, Set<string>>()
  for (const t of teams) {
    const set = tournamentsByDuo.get(t['duo_id'] as string) ?? new Set<string>()
    set.add(t['tournament_id'] as string)
    tournamentsByDuo.set(t['duo_id'] as string, set)
  }

  return duoRecords
    .map((r) => {
      const duo = recordToDuo(r)
      const tournamentsPlayed = tournamentsByDuo.get(duo.id)?.size ?? 0
      const partnerId = duo.player1 === playerId ? duo.player2 : duo.player1
      return {
        duo,
        partnerId,
        partnerName: partnerNames.get(partnerId) ?? '—',
        tournamentsPlayed,
        legendary: isLegendary(duo, tournamentsPlayed),
      }
    })
    .sort((a, b) => b.tournamentsPlayed - a.tournamentsPlayed || a.duo.name.localeCompare(b.duo.name))
}
