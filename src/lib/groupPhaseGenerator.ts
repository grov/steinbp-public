import { pb } from './pocketbase'
import type { RecordModel } from 'pocketbase'
import type { Group, Match, Team, Tournament } from '../types/database'

function recordToGroup(record: RecordModel): Group {
  return {
    id: record.id,
    tournament_id: record['tournament_id'] as string,
    name: record['name'] as string,
    created: record.created,
  }
}

export async function generateGroupPhase(
  tournament: Tournament,
  teams: Team[],
): Promise<void> {
  const { groups_count, teams_advance_per_group } = tournament
  if (!groups_count || !teams_advance_per_group) {
    throw new Error('Configuration de poules manquante')
  }

  const realTeams = teams.filter((t) => !t.is_bye)
  if (realTeams.length < groups_count * 2) {
    throw new Error('Pas assez d\'équipes pour le nombre de groupes demandé')
  }

  // ── 1. Mélanger et répartir les équipes ─────────────────────
  const shuffled = [...realTeams].sort(() => Math.random() - 0.5)
  const groupTeams: Team[][] = Array.from({ length: groups_count }, () => [])
  shuffled.forEach((team, i) => { groupTeams[i % groups_count].push(team) })

  // ── 2. Créer les groupes ─────────────────────────────────────
  const groupRecords = await Promise.all(
    Array.from({ length: groups_count }, (_, i) =>
      pb.collection('groups').create({
        tournament_id: tournament.id,
        name: `Groupe ${String.fromCharCode(65 + i)}`,
      }, { requestKey: null }),
    ),
  )
  const groups = groupRecords.map(recordToGroup)

  // ── 3. Pour chaque groupe : matchs round-robin + classements ─
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g]
    const gTeams = groupTeams[g]

    // Classements initiaux
    await Promise.all(
      gTeams.map((team) =>
        pb.collection('group_standings').create({
          tournament_id: tournament.id,
          group_id: group.id,
          team_id: team.id,
          played: 0,
          wins: 0,
          losses: 0,
          cups_for: 0,
          cups_against: 0,
          points: 0,
        }, { requestKey: null }),
      ),
    )

    // Matchs round-robin
    let matchNumber = 1
    for (let i = 0; i < gTeams.length; i++) {
      for (let j = i + 1; j < gTeams.length; j++) {
        await pb.collection('matches').create({
          tournament_id: tournament.id,
          group_id: group.id,
          phase: 'group',
          round: 1,
          match_number: matchNumber++,
          team1_id: gTeams[i].id,
          team2_id: gTeams[j].id,
          status: 'ready',
        })
      }
    }
  }
}

export async function reverseGroupStandings(
  match: Match,
  cupsPerSide: number,
): Promise<void> {
  if (!match.group_id || !match.winner_id || match.winner_cups_remaining === null) return

  const loserId = match.winner_id === match.team1_id ? match.team2_id : match.team1_id
  if (!loserId) return

  const winnerCupsFor = cupsPerSide
  const winnerCupsAgainst = cupsPerSide - match.winner_cups_remaining
  const loserCupsFor = cupsPerSide - match.winner_cups_remaining
  const loserCupsAgainst = cupsPerSide

  const standings = await pb.collection('group_standings').getFullList({
    filter: `group_id = "${match.group_id}" && (team_id = "${match.winner_id}" || team_id = "${loserId}")`,
    requestKey: null,
  })

  const winnerStanding = standings.find((s) => s['team_id'] === match.winner_id)
  const loserStanding = standings.find((s) => s['team_id'] === loserId)

  if (winnerStanding) {
    await pb.collection('group_standings').update(winnerStanding.id, {
      played: Math.max(0, (winnerStanding['played'] as number) - 1),
      wins: Math.max(0, (winnerStanding['wins'] as number) - 1),
      cups_for: Math.max(0, (winnerStanding['cups_for'] as number) - winnerCupsFor),
      cups_against: Math.max(0, (winnerStanding['cups_against'] as number) - winnerCupsAgainst),
      points: Math.max(0, (winnerStanding['points'] as number) - 2),
    })
  }

  if (loserStanding) {
    await pb.collection('group_standings').update(loserStanding.id, {
      played: Math.max(0, (loserStanding['played'] as number) - 1),
      losses: Math.max(0, (loserStanding['losses'] as number) - 1),
      cups_for: Math.max(0, (loserStanding['cups_for'] as number) - loserCupsFor),
      cups_against: Math.max(0, (loserStanding['cups_against'] as number) - loserCupsAgainst),
    })
  }
}

export async function updateGroupStandings(
  match: Match,
  cupsPerSide: number,
): Promise<void> {
  if (!match.group_id || !match.winner_id || match.winner_cups_remaining === null) return

  const loserId = match.winner_id === match.team1_id ? match.team2_id : match.team1_id
  if (!loserId) return

  const winnerCupsFor = cupsPerSide
  const winnerCupsAgainst = cupsPerSide - match.winner_cups_remaining
  const loserCupsFor = cupsPerSide - match.winner_cups_remaining
  const loserCupsAgainst = cupsPerSide

  const standings = await pb.collection('group_standings').getFullList({
    filter: `group_id = "${match.group_id}" && (team_id = "${match.winner_id}" || team_id = "${loserId}")`,
    requestKey: null,
  })

  const winnerStanding = standings.find((s) => s['team_id'] === match.winner_id)
  const loserStanding = standings.find((s) => s['team_id'] === loserId)

  if (winnerStanding) {
    await pb.collection('group_standings').update(winnerStanding.id, {
      played: (winnerStanding['played'] as number) + 1,
      wins: (winnerStanding['wins'] as number) + 1,
      cups_for: (winnerStanding['cups_for'] as number) + winnerCupsFor,
      cups_against: (winnerStanding['cups_against'] as number) + winnerCupsAgainst,
      points: (winnerStanding['points'] as number) + 2,
    })
  }

  if (loserStanding) {
    await pb.collection('group_standings').update(loserStanding.id, {
      played: (loserStanding['played'] as number) + 1,
      losses: (loserStanding['losses'] as number) + 1,
      cups_for: (loserStanding['cups_for'] as number) + loserCupsFor,
      cups_against: (loserStanding['cups_against'] as number) + loserCupsAgainst,
    })
  }
}

export async function checkAndGenerateFinalBracket(
  tournament: Tournament,
): Promise<boolean> {
  const result = await pb.collection('matches').getList(1, 1, {
    filter: `tournament_id = "${tournament.id}" && phase = "group" && status != "finished"`,
    requestKey: null,
  })

  if (result.totalItems > 0) return false

  const groups = await pb.collection('groups').getFullList({
    filter: `tournament_id = "${tournament.id}"`,
    fields: 'id',
    requestKey: null,
  })

  if (!groups.length) return false

  const qualifiedIds: string[] = []

  for (const group of groups) {
    const standings = await pb.collection('group_standings').getFullList({
      filter: `group_id = "${group.id}"`,
      fields: 'team_id,points,cups_for,cups_against',
      requestKey: null,
    })

    const sorted = [...standings].sort((a, b) => {
      const bp = (b['points'] as number) - (a['points'] as number)
      if (bp !== 0) return bp
      const diffA = (a['cups_for'] as number) - (a['cups_against'] as number)
      const diffB = (b['cups_for'] as number) - (b['cups_against'] as number)
      return diffB - diffA
    })

    const advance = tournament.teams_advance_per_group ?? 2
    sorted.slice(0, advance).forEach((s) => qualifiedIds.push(s['team_id'] as string))
  }

  if (qualifiedIds.length < 2) return false

  const teamFilter = qualifiedIds.map((id) => `id = "${id}"`).join(' || ')
  const qualifiedTeamRecords = await pb.collection('teams').getFullList({
    filter: teamFilter,
    requestKey: null,
  })

  const qualifiedTeams: Team[] = qualifiedTeamRecords.map((r) => ({
    id: r.id,
    tournament_id: r['tournament_id'] as string,
    name: r['name'] as string,
    player1_name: r['player1_name'] as string,
    player2_name: r['player2_name'] as string,
    player1_id: (r['player1_id'] as string) || null,
    player2_id: (r['player2_id'] as string) || null,
    is_bye: r['is_bye'] as boolean,
    seed: (r['seed'] as number | null) || null,
    created: r.created,
  }))

  const { generateSingleEliminationBracket } = await import('./bracketGenerator')
  await generateSingleEliminationBracket(tournament, qualifiedTeams)

  await pb.collection('tournaments').update(tournament.id, { status: 'bracket_phase' })

  return true
}
