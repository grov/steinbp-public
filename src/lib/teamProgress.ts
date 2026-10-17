import type { Match, Tournament } from '../types/database'

export type TeamProgress =
  | { kind: 'waiting' }
  | { kind: 'qualifying'; rank: number; points: number }
  | { kind: 'not_qualified'; rank: number }
  | { kind: 'alive'; round: number; maxRound: number }
  | { kind: 'eliminated'; round: number; maxRound: number }
  | { kind: 'runner_up' }
  | { kind: 'champion' }

/**
 * Situation d'une équipe dans le tournoi.
 * @param ranking identifiants des équipes de sa poule, du 1er au dernier
 */
export function teamProgress(
  teamId: string,
  tournament: Pick<Tournament, 'status'>,
  matches: Match[],
  ranking: { team_id: string; points: number }[] = [],
): TeamProgress {
  const bracket = matches.filter((m) => m.phase === 'bracket')
  const maxRound = Math.max(0, ...bracket.map((m) => m.round))
  const mine = bracket.filter((m) => m.team1_id === teamId || m.team2_id === teamId)

  if (mine.length > 0) {
    const lost = mine.find((m) => m.status === 'finished' && m.winner_id && m.winner_id !== teamId)
    if (lost) {
      return lost.round === maxRound
        ? { kind: 'runner_up' }
        : { kind: 'eliminated', round: lost.round, maxRound }
    }
    const final = mine.find((m) => m.round === maxRound)
    if (final?.status === 'finished' && final.winner_id === teamId) return { kind: 'champion' }
    return { kind: 'alive', round: Math.max(...mine.map((m) => m.round)), maxRound }
  }

  const index = ranking.findIndex((row) => row.team_id === teamId)
  if (index >= 0) {
    if (tournament.status === 'group_phase') {
      return { kind: 'qualifying', rank: index + 1, points: ranking[index].points }
    }
    if (bracket.length > 0 || tournament.status === 'finished') {
      return { kind: 'not_qualified', rank: index + 1 }
    }
  }

  return { kind: 'waiting' }
}
