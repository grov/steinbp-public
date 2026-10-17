import type { Match, MatchPhase, MatchResult, ScoringRules, Tournament } from '../types/database'
import { cupScoreForResult } from './cupScoring'

// ── Barèmes ───────────────────────────────────────────────────

/** Barème officiel : 3 victoire, 2 victoire au temps, 1 égalité, 0 défaite. */
export const OFFICIAL_SCORING: ScoringRules = { win: 3, win_time: 2, draw: 1, loss: 0 }

/** Barème historique des poules : 2 points par victoire. */
export const CLASSIC_SCORING: ScoringRules = { win: 2, win_time: 2, draw: 1, loss: 0 }

export const DEFAULT_MATCH_DURATION = 10

type ScoreContext = Pick<Tournament, 'cups_per_side' | 'cups_to_win'>

// ── Score d'un match ──────────────────────────────────────────

export interface MatchCups {
  team1: number
  team2: number
}

/**
 * Gobelets mis par chaque équipe sur un match terminé.
 * Les anciens matchs n'ont que winner_cups_remaining (scores à 0/0) :
 * le score est alors déduit de l'objectif du match.
 */
export function matchCups(match: Match, ctx: ScoreContext): MatchCups | null {
  if (match.status !== 'finished') return null

  const team1 = match.team1_cups ?? 0
  const team2 = match.team2_cups ?? 0

  if (team1 === 0 && team2 === 0 && match.winner_id && match.winner_cups_remaining !== null) {
    const score = cupScoreForResult(ctx.cups_per_side, ctx.cups_to_win, match.winner_cups_remaining)
    const team1Won = match.winner_id === match.team1_id
    return {
      team1: team1Won ? score.winnerFor : score.loserFor,
      team2: team1Won ? score.loserFor : score.winnerFor,
    }
  }

  return { team1, team2 }
}

export type Outcome = 'win' | 'win_time' | 'draw' | 'loss'

/** Issue du match pour une équipe : victoire normale si l'objectif est atteint, sinon au temps. */
export function teamOutcome(match: Match, teamId: string, ctx: ScoreContext): Outcome | null {
  const cups = matchCups(match, ctx)
  if (!cups) return null
  if (!match.winner_id) return 'draw'
  if (match.winner_id !== teamId) return 'loss'
  const winnerCups = match.team1_id === teamId ? cups.team1 : cups.team2
  return winnerCups >= ctx.cups_to_win ? 'win' : 'win_time'
}

// ── Saisie du résultat ────────────────────────────────────────

/** Valide un score saisi et renvoie un message d'erreur, ou null s'il est cohérent. */
export function validateResult(
  result: MatchResult,
  match: Pick<Match, 'team1_id' | 'team2_id'>,
  phase: MatchPhase,
  ctx: ScoreContext & { allowTimeLimit: boolean },
): string | null {
  const { team1Cups, team2Cups, winnerId } = result
  const target = ctx.cups_to_win

  for (const cups of [team1Cups, team2Cups]) {
    if (!Number.isInteger(cups) || cups < 0 || cups > target) {
      return `Le score doit être compris entre 0 et ${target}.`
    }
  }
  if (team1Cups === target && team2Cups === target) {
    return 'Les deux équipes ne peuvent pas avoir atteint l\'objectif.'
  }

  const finishedNormally = team1Cups === target || team2Cups === target
  const timedOut = !finishedNormally

  if (timedOut && !(ctx.allowTimeLimit && phase === 'group')) {
    return `Une équipe doit mettre ${target} gobelet${target > 1 ? 's' : ''} pour gagner.`
  }

  const expectedWinner =
    team1Cups > team2Cups ? match.team1_id : team2Cups > team1Cups ? match.team2_id : null
  if (winnerId !== expectedWinner) return 'Le vainqueur ne correspond pas au score.'

  return null
}

/** Résultat déduit du vainqueur et du score : le plus de gobelets gagne, sinon égalité. */
export function resultFromCups(
  match: Pick<Match, 'team1_id' | 'team2_id'>,
  team1Cups: number,
  team2Cups: number,
): MatchResult {
  const winnerId =
    team1Cups > team2Cups ? match.team1_id : team2Cups > team1Cups ? match.team2_id : null
  return { winnerId, team1Cups, team2Cups }
}

/** Résultat d'une saisie classique (vainqueur + gobelets restants au vainqueur). */
export function resultFromWinner(
  match: Pick<Match, 'team1_id' | 'team2_id'>,
  winnerId: string,
  winnerCupsRemaining: number,
  ctx: ScoreContext,
): MatchResult {
  const score = cupScoreForResult(ctx.cups_per_side, ctx.cups_to_win, winnerCupsRemaining)
  const team1Won = winnerId === match.team1_id
  return {
    winnerId,
    team1Cups: team1Won ? score.winnerFor : score.loserFor,
    team2Cups: team1Won ? score.loserFor : score.winnerFor,
  }
}

/** Gobelets restants au vainqueur (champ historique), dérivés du score adverse. */
export function winnerCupsRemaining(result: MatchResult, cupsPerSide: number): number | null {
  if (!result.winnerId) return null
  const loserCups = Math.min(result.team1Cups, result.team2Cups)
  return Math.max(0, cupsPerSide - loserCups)
}

// ── Classement ────────────────────────────────────────────────

export interface StandingRow {
  team_id: string
  played: number
  wins: number
  draws: number
  losses: number
  cups_for: number
  cups_against: number
  points: number
}

export function emptyStanding(teamId: string): StandingRow {
  return { team_id: teamId, played: 0, wins: 0, draws: 0, losses: 0, cups_for: 0, cups_against: 0, points: 0 }
}

/** Points, puis différence de gobelets, puis gobelets mis. */
export function compareStandings(a: StandingRow, b: StandingRow): number {
  return (
    b.points - a.points ||
    (b.cups_for - b.cups_against) - (a.cups_for - a.cups_against) ||
    b.cups_for - a.cups_for
  )
}

/** Recalcule entièrement le classement à partir des matchs terminés. */
export function computeStandings(
  teamIds: string[],
  matches: Match[],
  ctx: ScoreContext,
  rules: ScoringRules,
): StandingRow[] {
  const rows = new Map(teamIds.map((id) => [id, emptyStanding(id)]))

  for (const match of matches) {
    const cups = matchCups(match, ctx)
    if (!cups || !match.team1_id || !match.team2_id) continue

    const sides = [
      { id: match.team1_id, for: cups.team1, against: cups.team2 },
      { id: match.team2_id, for: cups.team2, against: cups.team1 },
    ]

    for (const side of sides) {
      const row = rows.get(side.id)
      if (!row) continue
      const outcome = teamOutcome(match, side.id, ctx)!
      row.played += 1
      row.cups_for += side.for
      row.cups_against += side.against
      row.points += rules[outcome]
      if (outcome === 'draw') row.draws += 1
      else if (outcome === 'loss') row.losses += 1
      else row.wins += 1
    }
  }

  return [...rows.values()].sort(compareStandings)
}

// ── Calendrier chacun-contre-chacun ──────────────────────────

/**
 * Méthode du cercle : chaque tour fait jouer toutes les équipes une fois
 * (une équipe au repos par tour si leur nombre est impair), ce qui étale
 * les matchs de chaque équipe sur toute la phase.
 */
export function roundRobinRounds<T>(teams: T[]): [T, T][][] {
  const slots: (T | null)[] = [...teams]
  if (slots.length % 2 === 1) slots.push(null)
  const n = slots.length
  const rounds: [T, T][][] = []

  for (let r = 0; r < n - 1; r++) {
    const pairs: [T, T][] = []
    for (let i = 0; i < n / 2; i++) {
      const home = slots[i]
      const away = slots[n - 1 - i]
      if (home !== null && away !== null) {
        // Alterne les côtés pour que la première équipe ne soit pas toujours à gauche.
        pairs.push(r % 2 === 0 ? [home, away] : [away, home])
      }
    }
    rounds.push(pairs)
    // Rotation : la première équipe reste fixe, les autres tournent.
    slots.splice(1, 0, slots.pop()!)
  }

  return rounds
}

// ── Règlement affiché aux joueurs ─────────────────────────────

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Règles du format officiel, générées à partir des réglages du tournoi. */
export function officialRulesText(
  tournament: Pick<Tournament, 'match_duration' | 'scoring' | 'qualified_count' | 'cups_to_win'>,
): string {
  const { scoring, cups_to_win: target } = tournament
  const duration = tournament.match_duration ?? DEFAULT_MATCH_DURATION
  const qualified = tournament.qualified_count
    ? `les ${tournament.qualified_count} premières équipes du classement`
    : 'toutes les équipes'

  return [
    'Qualifications',
    `Chaque équipe affronte toutes les autres. Un match dure ${plural(duration, 'minute')} : il se gagne en mettant ${plural(target, 'gobelet')}, sinon au plus grand nombre de gobelets à la fin du temps.`,
    `• Victoire : ${plural(scoring.win, 'point')}`,
    `• Victoire au temps : ${plural(scoring.win_time, 'point')}`,
    `• Égalité au temps : ${plural(scoring.draw, 'point')}`,
    `• Défaite : ${plural(scoring.loss, 'point')}`,
    'À égalité de points : différence de gobelets, puis gobelets mis.',
    '',
    'Phase finale',
    `Élimination directe pour ${qualified}, sans limite de temps ni match nul. Les mieux classés affrontent les derniers qualifiés.`,
  ].join('\n')
}
