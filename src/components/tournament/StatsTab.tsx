import type { MatchWithRelations, Team } from '../../types/database'

interface TeamStat {
  team: Team
  played: number
  wins: number
  losses: number
  ratio: number
  cupsScored: number
  cupsRemaining: number
}

interface StatsTabProps {
  teams: Team[]
  matches: MatchWithRelations[]
  cupsPerSide: number
}

export function StatsTab({ teams, matches, cupsPerSide }: StatsTabProps) {
  const realTeams = teams.filter((t) => !t.is_bye)
  const finishedMatches = matches.filter((m) => m.status === 'finished')

  const stats: TeamStat[] = realTeams
    .map((team) => {
      const teamMatches = finishedMatches.filter(
        (m) => m.team1_id === team.id || m.team2_id === team.id,
      )
      const wins = teamMatches.filter((m) => m.winner_id === team.id).length
      const played = teamMatches.length

      // Gobelets mis : cupsPerSide si victoire, cupsPerSide - winner_cups_remaining si défaite
      const cupsScored = teamMatches.reduce((sum, m) => {
        if (m.winner_cups_remaining === null) return sum
        return sum + (m.winner_id === team.id ? cupsPerSide : cupsPerSide - m.winner_cups_remaining)
      }, 0)

      // Gobelets restants : somme des winner_cups_remaining sur les victoires
      const cupsRemaining = teamMatches.reduce((sum, m) => {
        if (m.winner_id !== team.id || m.winner_cups_remaining === null) return sum
        return sum + m.winner_cups_remaining
      }, 0)

      return {
        team,
        played,
        wins,
        losses: played - wins,
        ratio: played > 0 ? wins / played : 0,
        cupsScored,
        cupsRemaining,
      }
    })
    .sort((a, b) => b.wins - a.wins || b.ratio - a.ratio || a.team.name.localeCompare(b.team.name))

  if (finishedMatches.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-600">
        <p className="text-4xl mb-2">📊</p>
        <p>Aucun match terminé pour l'instant.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Classement · {finishedMatches.length} match{finishedMatches.length > 1 ? 's' : ''} joué{finishedMatches.length > 1 ? 's' : ''}
      </h2>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-wider">
              <th className="text-left px-3 py-3 w-8">#</th>
              <th className="text-left px-3 py-3">Équipe</th>
              <th className="text-center px-2 py-3">J</th>
              <th className="text-center px-2 py-3">V</th>
              <th className="text-center px-2 py-3">D</th>
              <th className="text-center px-2 py-3">%V</th>
              <th className="text-center px-2 py-3" title="Gobelets mis">🎯</th>
              <th className="text-center px-2 py-3" title="Gobelets restants">🥤</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s, i) => {
              const medal = i === 0 && s.wins > 0 ? '🥇' : i === 1 && s.wins > 0 ? '🥈' : i === 2 && s.wins > 0 ? '🥉' : null
              return (
                <tr
                  key={s.team.id}
                  className={`border-b border-zinc-800/50 last:border-0 ${i === 0 && s.wins > 0 ? 'bg-yellow-500/5' : ''}`}
                >
                  <td className="px-3 py-3 text-center">
                    {medal ? (
                      <span>{medal}</span>
                    ) : (
                      <span className="text-zinc-600 text-xs font-mono">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-white leading-tight">{s.team.name}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      {[s.team.player1_name, s.team.player2_name].filter(Boolean).join(' & ')}
                    </p>
                  </td>
                  <td className="text-center px-2 py-3 text-zinc-400 font-mono text-sm">{s.played}</td>
                  <td className="text-center px-2 py-3 font-bold font-mono text-sm">
                    <span className={s.wins > 0 ? 'text-green-400' : 'text-zinc-600'}>{s.wins}</span>
                  </td>
                  <td className="text-center px-2 py-3 font-mono text-sm">
                    <span className={s.losses > 0 ? 'text-red-400' : 'text-zinc-600'}>{s.losses}</span>
                  </td>
                  <td className="text-center px-2 py-3 font-mono font-bold text-sm">
                    {s.played > 0 ? (
                      <span
                        className={
                          s.ratio >= 0.67
                            ? 'text-green-400'
                            : s.ratio >= 0.5
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }
                      >
                        {Math.round(s.ratio * 100)}%
                      </span>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                  <td className="text-center px-2 py-3 font-mono text-sm">
                    <span className={s.cupsScored > 0 ? 'text-orange-400' : 'text-zinc-600'}>
                      {s.cupsScored}
                    </span>
                  </td>
                  <td className="text-center px-2 py-3 font-mono text-sm">
                    <span className={s.cupsRemaining > 0 ? 'text-brand' : 'text-zinc-600'}>
                      {s.cupsRemaining}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-zinc-700 text-xs text-center">
        J = joués · V = victoires · D = défaites · %V = ratio · 🎯 = gobelets mis · 🥤 = gobelets restants
      </p>
    </div>
  )
}
