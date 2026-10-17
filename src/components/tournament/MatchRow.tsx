import type { MatchWithRelations, Team, Tournament } from '../../types/database'
import { ScorePill, matchSides } from './ScorePill'
import { MatchTimer, isTimedMatch } from './MatchTimer'
import { teamPlayers } from '../../lib/records'

export function formatTime(iso: string | null): string {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Ligne de match : pastille noire table/heure, puis les deux équipes et
 * leur score coloré (vert gagné, rouge perdu, orange égalité).
 */
export function MatchRow({
  match,
  tournament,
  onTeamClick,
}: {
  match: MatchWithRelations
  tournament: Tournament
  onTeamClick?: (team: Team) => void
}) {
  const sides = matchSides(match, tournament)
  const inProgress = match.status === 'in_progress'

  return (
    <div className="flex items-stretch gap-2">
      <div
        className={`w-[4.5rem] shrink-0 rounded-xl flex flex-col items-center justify-center py-2 text-xs font-semibold leading-tight
          ${inProgress ? 'bg-win text-paper' : 'bg-black text-paper'}`}
      >
        {!match.table && !match.started_at ? (
          <span>À venir</span>
        ) : (
          <span>{match.table?.name ?? '—'}</span>
        )}
        {!match.table && !match.started_at ? null : isTimedMatch(match, tournament) ? (
          <MatchTimer
            startedAt={match.started_at!}
            durationMinutes={tournament.match_duration!}
            className="!text-paper text-[11px]"
          />
        ) : (
          <span>{inProgress ? 'En cours' : formatTime(match.started_at)}</span>
        )}
      </div>

      <div className="flex-1 min-w-0 bg-zinc-900 rounded-xl px-2 py-2 flex items-center gap-1.5">
        <TeamName team={match.team1} align="right" onClick={onTeamClick} />
        <ScorePill value={sides.cups1} tone={sides.tone1} size="sm" />
        <span className="text-zinc-500 text-xs">vs</span>
        <ScorePill value={sides.cups2} tone={sides.tone2} size="sm" />
        <TeamName team={match.team2} align="left" onClick={onTeamClick} />
      </div>
    </div>
  )
}

function TeamName({
  team,
  align,
  onClick,
}: {
  team: Team | null
  align: 'left' | 'right'
  onClick?: (team: Team) => void
}) {
  const alignClass = align === 'right' ? 'text-right' : 'text-left'
  if (!team || team.is_bye) {
    return <span className={`flex-1 min-w-0 text-zinc-500 text-sm ${alignClass}`}>{team ? '—' : 'À déterminer'}</span>
  }
  const content = (
    <>
      <span className="line-clamp-2 break-words">{team.name}</span>
      <span className="block truncate text-[11px] font-normal text-zinc-500">{teamPlayers(team)}</span>
    </>
  )
  return onClick ? (
    <button
      onClick={() => onClick(team)}
      className={`flex-1 min-w-0 text-sm font-medium text-white hover:underline ${alignClass}`}
    >
      {content}
    </button>
  ) : (
    <span className={`flex-1 min-w-0 text-sm font-medium text-white ${alignClass}`}>{content}</span>
  )
}
