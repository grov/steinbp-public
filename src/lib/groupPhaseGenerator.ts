import { pb } from './pocketbase'
import type { RecordModel } from 'pocketbase'
import type { Group, Team, Tournament } from '../types/database'
import { computeStandings, qualifiedCountFor, roundRobinRounds, type StandingRow } from './standings'
import { recordToMatch, recordToTeam } from './records'
import { generateSingleEliminationBracket } from './bracketGenerator'

function recordToGroup(record: RecordModel): Group {
  return {
    id: record.id,
    tournament_id: record['tournament_id'] as string,
    name: record['name'] as string,
    created: record.created,
  }
}

/**
 * Répartit les équipes en poules (ou en une seule poule de qualification
 * pour un tournoi officiel) et crée les matchs chacun-contre-chacun.
 */
export async function generateGroupPhase(
  tournament: Tournament,
  teams: Team[],
): Promise<void> {
  const realTeams = teams.filter((t) => !t.is_bye)
  const isOfficial = tournament.format === 'official'

  const groupsCount = isOfficial ? 1 : tournament.groups_count
  if (!groupsCount || (!isOfficial && !tournament.teams_advance_per_group)) {
    throw new Error('Configuration de poules manquante')
  }
  if (realTeams.length < groupsCount * 2) {
    throw new Error(isOfficial
      ? 'Au moins 2 équipes nécessaires'
      : 'Pas assez d\'équipes pour le nombre de groupes demandé')
  }

  // ── 1. Mélanger et répartir les équipes ─────────────────────
  const shuffled = [...realTeams].sort(() => Math.random() - 0.5)
  const groupTeams: Team[][] = Array.from({ length: groupsCount }, () => [])
  shuffled.forEach((team, i) => { groupTeams[i % groupsCount].push(team) })

  // ── 2. Créer les groupes ─────────────────────────────────────
  const groupRecords = await Promise.all(
    Array.from({ length: groupsCount }, (_, i) =>
      pb.collection('groups').create({
        tournament_id: tournament.id,
        name: isOfficial ? 'Qualifications' : `Groupe ${String.fromCharCode(65 + i)}`,
      }, { requestKey: null }),
    ),
  )
  const groups = groupRecords.map(recordToGroup)

  // ── 3. Pour chaque groupe : matchs round-robin + classements ─
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]
    const gTeams = groupTeams[g]

    await Promise.all(
      gTeams.map((team) =>
        pb.collection('group_standings').create({
          tournament_id: tournament.id,
          group_id: group.id,
          team_id: team.id,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          cups_for: 0,
          cups_against: 0,
          points: 0,
        }, { requestKey: null }),
      ),
    )

    // Un tour = chaque équipe joue au plus une fois : les matchs d'une même
    // équipe sont étalés sur toute la phase.
    let matchNumber = 1
    const rounds = roundRobinRounds(gTeams)
    for (let r = 0; r < rounds.length; r++) {
      for (const [team1, team2] of rounds[r]) {
        await pb.collection('matches').create({
          tournament_id: tournament.id,
          group_id: group.id,
          phase: 'group',
          round: r + 1,
          match_number: matchNumber++,
          team1_id: team1.id,
          team2_id: team2.id,
          status: 'ready',
        }, { requestKey: null })
      }
    }
  }
}

// ── Classements ───────────────────────────────────────────────

/** Recalcule le classement d'une poule à partir de tous ses matchs terminés. */
export async function recomputeGroupStandings(tournament: Tournament, groupId: string): Promise<void> {
  const [standingRecords, matchRecords] = await Promise.all([
    pb.collection('group_standings').getFullList({
      filter: pb.filter('group_id = {:groupId}', { groupId }),
      requestKey: null,
    }),
    pb.collection('matches').getFullList({
      filter: pb.filter('group_id = {:groupId} && status = "finished"', { groupId }),
      requestKey: null,
    }),
  ])

  const rows = computeStandings(
    standingRecords.map((s) => s['team_id'] as string),
    matchRecords.map(recordToMatch),
    tournament,
    tournament.scoring,
  )
  const rowByTeam = new Map(rows.map((row) => [row.team_id, row]))

  await Promise.all(
    standingRecords.map((standing) => {
      const { team_id: _teamId, ...values } = rowByTeam.get(standing['team_id'] as string)!
      return pb.collection('group_standings').update(standing.id, values, { requestKey: null })
    }),
  )
}

/** Classement trié d'une poule (lecture seule, sans requête supplémentaire). */
async function sortedGroupStandings(tournament: Tournament, groupId: string): Promise<StandingRow[]> {
  const matchRecords = await pb.collection('matches').getFullList({
    filter: pb.filter('group_id = {:groupId} && status = "finished"', { groupId }),
    requestKey: null,
  })
  const standingRecords = await pb.collection('group_standings').getFullList({
    filter: pb.filter('group_id = {:groupId}', { groupId }),
    fields: 'team_id',
    requestKey: null,
  })
  return computeStandings(
    standingRecords.map((s) => s['team_id'] as string),
    matchRecords.map(recordToMatch),
    tournament,
    tournament.scoring,
  )
}

// ── Passage à l'arbre final ───────────────────────────────────

export async function checkAndGenerateFinalBracket(
  tournament: Tournament,
): Promise<boolean> {
  const result = await pb.collection('matches').getList(1, 1, {
    filter: pb.filter('tournament_id = {:id} && phase = "group" && status != "finished"', { id: tournament.id }),
    requestKey: null,
  })
  if (result.totalItems > 0) return false

  // Un arbre déjà généré ne doit jamais l'être une seconde fois.
  const existingBracket = await pb.collection('matches').getList(1, 1, {
    filter: pb.filter('tournament_id = {:id} && phase = "bracket"', { id: tournament.id }),
    requestKey: null,
  })
  if (existingBracket.totalItems > 0) return false

  const groups = await pb.collection('groups').getFullList({
    filter: pb.filter('tournament_id = {:id}', { id: tournament.id }),
    fields: 'id',
    sort: '+id',
    requestKey: null,
  })
  if (!groups.length) return false

  // Ordre des qualifiés = ordre de tête de série (1er = meilleure équipe).
  let qualifiedIds: string[] = []

  if (tournament.format === 'official') {
    const ranking = await sortedGroupStandings(tournament, groups[0].id)
    const count = qualifiedCountFor(tournament.qualified_count, ranking.length)
    qualifiedIds = ranking.slice(0, count).map((row) => row.team_id)
  } else {
    const advance = tournament.teams_advance_per_group ?? 2
    for (const group of groups) {
      const ranking = await sortedGroupStandings(tournament, group.id)
      qualifiedIds.push(...ranking.slice(0, advance).map((row) => row.team_id))
    }
  }

  if (qualifiedIds.length < 2) return false

  const teamRecords = await pb.collection('teams').getFullList({
    filter: qualifiedIds.map((id) => pb.filter('id = {:id}', { id })).join(' || '),
    requestKey: null,
  })
  const teamsById = new Map(teamRecords.map((r) => [r.id, recordToTeam(r)]))

  const qualifiedTeams: Team[] = qualifiedIds.map((id, index) => ({
    ...teamsById.get(id)!,
    // Tournoi officiel : les mieux classés affrontent les derniers qualifiés
    // et reçoivent les exemptions.
    seed: tournament.format === 'official' ? index + 1 : null,
  }))

  await generateSingleEliminationBracket(tournament, qualifiedTeams)

  await pb.collection('tournaments').update(tournament.id, { status: 'bracket_phase' })

  return true
}
