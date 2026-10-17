import type { GroupStandingWithTeam, Team } from '../../types/database'
import { compareStandings, qualifiedCountFor } from '../../lib/standings'
import { teamPlayers } from '../../lib/records'

/**
 * Classement façon tableau officiel : rang (vert qualifié / rouge éliminé),
 * équipe, matchs joués, points et différence de gobelets. Mon équipe est
 * surlignée en jaune.
 */
export function RankingList({
  standings,
  qualifiedCount,
  myTeamIds = [],
  onTeamClick,
}: {
  standings: GroupStandingWithTeam[]
  /** Réglage du tournoi ; null = calcul automatique selon le nombre d'équipes. */
  qualifiedCount: number | null
  myTeamIds?: string[]
  onTeamClick?: (team: Team) => void
}) {
  const sorted = [...standings].sort(compareStandings)
  const cutoff = qualifiedCountFor(qualifiedCount, sorted.length)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className="w-11 shrink-0" />
        <div className="flex-1 flex items-center gap-2 px-3">
          <span className="flex-1" />
          <span className="w-9 text-center">J</span>
          <span className="w-10 text-center">PTS</span>
          <span className="w-10 text-center">+/-</span>
        </div>
      </div>

      {sorted.map((standing, index) => {
        const rank = index + 1
        const diff = standing.cups_for - standing.cups_against
        const isMine = myTeamIds.includes(standing.team_id)
        const rankTone = rank <= cutoff ? 'bg-qualified text-paper' : 'bg-loss text-paper'

        return (
          <div key={standing.id} className="flex items-center gap-2">
            <span className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-base font-semibold tabular-nums ${rankTone}`}>
              {rank}
            </span>
            <button
              type="button"
              disabled={!onTeamClick}
              onClick={() => onTeamClick?.(standing.team)}
              className={`flex-1 min-w-0 min-h-11 py-1 rounded-xl flex items-center gap-2 px-3 text-left
                ${isMine ? 'bg-highlight text-black' : 'bg-zinc-900 text-white'}
                ${onTeamClick ? 'active:scale-98 transition-transform' : ''}`}
            >
              <span className="flex-1 min-w-0 flex flex-col leading-tight">
                <span className="truncate font-medium">{standing.team.name || '?'}</span>
                {teamPlayers(standing.team) && (
                  <span className={`truncate text-[11px] ${isMine ? 'text-black/60' : 'text-zinc-500'}`}>{teamPlayers(standing.team)}</span>
                )}
              </span>
              <span className="w-9 text-center tabular-nums shrink-0">{standing.played}</span>
              <span className="w-10 text-center tabular-nums font-semibold shrink-0">{standing.points}</span>
              <span className="w-10 text-center tabular-nums shrink-0">{diff}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
