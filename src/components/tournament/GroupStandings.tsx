import type { GroupWithStandings } from '../../types/database'

interface GroupStandingsProps {
  groups: GroupWithStandings[]
}

export function GroupStandings({ groups }: GroupStandingsProps) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <p className="text-4xl mb-3">📊</p>
        <p>Les groupes n'ont pas encore été générés.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const sorted = [...(group.standings ?? [])].sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points
          return b.cups_for - b.cups_against - (a.cups_for - a.cups_against)
        })

        return (
          <div key={group.id} className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 bg-zinc-800/60">
              <h3 className="font-bold text-white text-lg">{group.name}</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-2 py-2">Équipe</th>
                    <th className="text-center px-2 py-2">J</th>
                    <th className="text-center px-2 py-2">V</th>
                    <th className="text-center px-2 py-2">D</th>
                    <th className="text-center px-2 py-2">+/-</th>
                    <th className="text-center px-2 py-2 font-bold text-zinc-400">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((standing, i) => {
                    const diff = standing.cups_for - standing.cups_against
                    return (
                      <tr
                        key={standing.id}
                        className={`border-t border-zinc-800 ${i === 0 ? 'text-green-300' : 'text-white'}`}
                      >
                        <td className="px-4 py-3 font-bold text-zinc-500">{i + 1}</td>
                        <td className="px-2 py-3">
                          <p className="font-semibold">{standing.team?.name ?? '?'}</p>
                          <p className="text-xs text-zinc-500">
                            {[standing.team?.player1_name, standing.team?.player2_name]
                              .filter(Boolean)
                              .join(' & ')}
                          </p>
                        </td>
                        <td className="text-center px-2 py-3 text-zinc-400">{standing.played}</td>
                        <td className="text-center px-2 py-3 text-green-400">{standing.wins}</td>
                        <td className="text-center px-2 py-3 text-red-400">{standing.losses}</td>
                        <td
                          className={`text-center px-2 py-3 font-mono ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-zinc-400'}`}
                        >
                          {diff > 0 ? '+' : ''}
                          {diff}
                        </td>
                        <td className="text-center px-2 py-3 font-black text-lg text-brand">
                          {standing.points}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
