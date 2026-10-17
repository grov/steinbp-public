import type { Match, Tournament } from '../../types/database'
import { matchCups } from '../../lib/standings'

export type PillTone = 'win' | 'loss' | 'draw' | 'none'

const TONE_CLASS: Record<PillTone, string> = {
  win: 'bg-win text-paper',
  loss: 'bg-loss text-paper',
  draw: 'bg-draw text-paper',
  none: 'bg-zinc-800 text-zinc-500',
}

export interface MatchSides {
  cups1: number | null
  cups2: number | null
  tone1: PillTone
  tone2: PillTone
}

/** Score et couleur de chaque côté : vert gagné, rouge perdu, orange égalité. */
export function matchSides(
  match: Match,
  ctx: Pick<Tournament, 'cups_per_side' | 'cups_to_win'>,
): MatchSides {
  const cups = matchCups(match, ctx)
  if (!cups) return { cups1: null, cups2: null, tone1: 'none', tone2: 'none' }
  if (!match.winner_id) return { cups1: cups.team1, cups2: cups.team2, tone1: 'draw', tone2: 'draw' }

  const team1Won = match.winner_id === match.team1_id
  return {
    cups1: cups.team1,
    cups2: cups.team2,
    tone1: team1Won ? 'win' : 'loss',
    tone2: team1Won ? 'loss' : 'win',
  }
}

export function ScorePill({
  value,
  tone,
  size = 'md',
}: {
  value: number | null
  tone: PillTone
  size?: 'sm' | 'md'
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-sm rounded-lg' : 'w-11 h-11 text-lg rounded-xl'
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 font-semibold tabular-nums ${sizeClass} ${TONE_CLASS[tone]}`}
    >
      {value ?? '–'}
    </span>
  )
}
