import { useEffect, useState } from 'react'
import { pb } from '../../lib/pocketbase'
import type { RecordModel } from 'pocketbase'

type SortKey = 'wins' | 'ratio'

interface TeamStat {
  id: string
  name: string
  player1_name: string
  player2_name: string
  tournament_name: string
  played: number
  wins: number
  losses: number
  ratio: number
}

export function PalmaresPanel() {
  const [rows, setRows] = useState<TeamStat[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<SortKey>('wins')

  useEffect(() => {
    let active = true

    async function load() {
      const teams = await pb.collection('teams').getFullList({
        filter: 'is_bye = false',
        expand: 'tournament_id',
        fields: 'id,name,player1_name,player2_name,tournament_id,collectionId,collectionName,expand',
        requestKey: null,
      })

      if (!active) return

      if (!teams.length) {
        setRows([])
        setLoading(false)
        return
      }

      const matches = await pb.collection('matches').getFullList({
        filter: 'status = "finished"',
        fields: 'team1_id,team2_id,winner_id',
        requestKey: null,
      })

      const statsMap: Record<string, { played: number; wins: number }> = {}
      for (const t of teams) statsMap[t.id] = { played: 0, wins: 0 }

      for (const m of matches) {
        const t1 = m['team1_id'] as string
        const t2 = m['team2_id'] as string
        const w = m['winner_id'] as string
        if (t1 && statsMap[t1]) statsMap[t1].played++
        if (t2 && statsMap[t2]) statsMap[t2].played++
        if (w && statsMap[w]) statsMap[w].wins++
      }

      const result: TeamStat[] = teams.map((t) => {
        const s = statsMap[t.id]
        const tournamentRec = t.expand?.['tournament_id'] as RecordModel | undefined
        return {
          id: t.id,
          name: t['name'] as string,
          player1_name: t['player1_name'] as string,
          player2_name: t['player2_name'] as string,
          tournament_name: tournamentRec ? (tournamentRec['name'] as string) : '',
          played: s.played,
          wins: s.wins,
          losses: s.played - s.wins,
          ratio: s.played > 0 ? s.wins / s.played : 0,
        }
      })

      setRows(result)
      setLoading(false)
    }

    load().catch((e: unknown) => {
      if (!(e as { isAbort?: boolean })?.isAbort) console.error(e)
    })

    return () => { active = false }
  }, [])

  const sorted = [...rows]
    .filter((r) => r.played > 0)
    .sort((a, b) =>
      sortBy === 'wins'
        ? b.wins - a.wins || b.ratio - a.ratio
        : b.ratio - a.ratio || b.wins - a.wins,
    )

  const noMatchTeams = rows.filter((r) => r.played === 0)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Palmarès · {rows.length} équipe{rows.length > 1 ? 's' : ''}
        </h2>

        <div className="flex bg-zinc-800 rounded-xl p-0.5 gap-0.5">
          <button
            onClick={() => setSortBy('wins')}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              sortBy === 'wins' ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Victoires
          </button>
          <button
            onClick={() => setSortBy('ratio')}
            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              sortBy === 'ratio' ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            % Victoire
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-zinc-600 text-sm text-center py-8">Chargement…</p>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-3xl mb-2">🏆</p>
          <p>Aucune équipe enregistrée.</p>
        </div>
      )}

      {!loading && sorted.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Équipe</th>
                <th className="text-center px-2 py-3">J</th>
                <th className="text-center px-2 py-3">V</th>
                <th className="text-center px-2 py-3">D</th>
                <th className="text-center px-2 py-3">%V</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => {
                const medal =
                  i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-zinc-800/50 last:border-0 ${
                      i === 0 ? 'bg-yellow-500/5' : i === 1 ? 'bg-zinc-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      {medal ? (
                        <span>{medal}</span>
                      ) : (
                        <span className="text-zinc-600 text-xs font-mono">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-0">
                      <p className="font-semibold text-white leading-tight truncate">{s.name}</p>
                      <p className="text-zinc-500 text-xs mt-0.5 truncate">
                        {[s.player1_name, s.player2_name].filter(Boolean).join(' & ')}
                      </p>
                      {s.tournament_name && (
                        <p className="text-zinc-700 text-[10px] mt-0.5 truncate">{s.tournament_name}</p>
                      )}
                    </td>
                    <td className="text-center px-2 py-3 text-zinc-400 font-mono text-sm">{s.played}</td>
                    <td className="text-center px-2 py-3 font-bold font-mono text-sm">
                      <span className={s.wins > 0 ? 'text-green-400' : 'text-zinc-600'}>{s.wins}</span>
                    </td>
                    <td className="text-center px-2 py-3 font-mono text-sm">
                      <span className={s.losses > 0 ? 'text-red-400' : 'text-zinc-600'}>{s.losses}</span>
                    </td>
                    <td className="text-center px-2 py-3 font-mono font-bold text-sm">
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && noMatchTeams.length > 0 && (
        <details className="text-zinc-600 text-xs">
          <summary className="cursor-pointer hover:text-zinc-400 transition-colors">
            {noMatchTeams.length} équipe{noMatchTeams.length > 1 ? 's' : ''} sans match joué
          </summary>
          <ul className="mt-2 flex flex-col gap-1 pl-2">
            {noMatchTeams.map((t) => (
              <li key={t.id} className="text-zinc-700">
                {t.name} <span className="text-zinc-800">· {t.tournament_name}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {!loading && sorted.length > 0 && (
        <p className="text-zinc-700 text-xs text-center">
          J = joués · V = victoires · D = défaites · %V = ratio victoires
        </p>
      )}
    </section>
  )
}
