import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { pb } from '../../lib/pocketbase'
import { fetchAllChallenges } from '../../lib/challengeActions'
import type { Challenge } from '../../types/database'

type SortKey = 'wins' | 'ratio'
type View = 'tournois' | 'defis'

interface PlayerAgg {
  key: string
  id: string | null
  name: string
  tPlayed: number
  tWins: number
  dPlayed: number
  dWins: number
}

interface PlayerRef {
  id: string | null
  name: string
}

function refKey(r: PlayerRef): string {
  return r.id ? `id:${r.id}` : `name:${r.name.trim().toLowerCase()}`
}

export function PalmaresPanel() {
  const [players, setPlayers] = useState<PlayerAgg[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('tournois')
  const [sortBy, setSortBy] = useState<SortKey>('wins')

  useEffect(() => {
    let active = true

    async function load() {
      const [teams, matches, challenges] = await Promise.all([
        pb.collection('teams').getFullList({
          filter: 'is_bye = false',
          fields: 'id,player1_name,player2_name,player1_id,player2_id',
          requestKey: null,
        }),
        pb.collection('matches').getFullList({
          filter: 'status = "finished"',
          fields: 'team1_id,team2_id,winner_id',
          requestKey: null,
        }),
        fetchAllChallenges(),
      ])

      if (!active) return

      const map = new Map<string, PlayerAgg>()
      function agg(ref: PlayerRef): PlayerAgg | null {
        if (!ref.name || !ref.name.trim()) return null
        const key = refKey(ref)
        let entry = map.get(key)
        if (!entry) {
          entry = { key, id: ref.id, name: ref.name.trim(), tPlayed: 0, tWins: 0, dPlayed: 0, dWins: 0 }
          map.set(key, entry)
        }
        return entry
      }

      // ── Tournois : agrège les joueurs à partir des équipes + matchs ──
      const teamPlayers = new Map<string, PlayerRef[]>()
      for (const t of teams) {
        const refs: PlayerRef[] = []
        const p1 = t['player1_name'] as string
        const p2 = t['player2_name'] as string
        if (p1?.trim()) refs.push({ id: (t['player1_id'] as string) || null, name: p1 })
        if (p2?.trim()) refs.push({ id: (t['player2_id'] as string) || null, name: p2 })
        teamPlayers.set(t.id, refs)
        refs.forEach(agg)
      }

      for (const m of matches) {
        const t1 = m['team1_id'] as string
        const t2 = m['team2_id'] as string
        const w = m['winner_id'] as string
        for (const teamId of [t1, t2]) {
          if (!teamId) continue
          for (const ref of teamPlayers.get(teamId) ?? []) {
            const a = agg(ref)
            if (a) a.tPlayed++
          }
        }
        if (w) {
          for (const ref of teamPlayers.get(w) ?? []) {
            const a = agg(ref)
            if (a) a.tWins++
          }
        }
      }

      // ── Défis ────────────────────────────────────────────────────
      for (const c of challenges) {
        const p1: PlayerRef = { id: c.player1_id, name: c.player1_name }
        const p2: PlayerRef = { id: c.player2_id, name: c.player2_name }
        const a1 = agg(p1)
        const a2 = agg(p2)
        if (a1) a1.dPlayed++
        if (a2) a2.dPlayed++
        if (challengeWon(c, p1)) { if (a1) a1.dWins++ }
        else if (challengeWon(c, p2)) { if (a2) a2.dWins++ }
      }

      setPlayers([...map.values()])
      setLoading(false)
    }

    load().catch((e: unknown) => {
      if (!(e as { isAbort?: boolean })?.isAbort) console.error(e)
    })

    return () => { active = false }
  }, [])

  const rows = useMemo(() => {
    return players
      .map((p) => {
        const played = view === 'tournois' ? p.tPlayed : p.dPlayed
        const wins = view === 'tournois' ? p.tWins : p.dWins
        return {
          key: p.key,
          id: p.id,
          name: p.name,
          played,
          wins,
          losses: played - wins,
          ratio: played > 0 ? wins / played : 0,
        }
      })
      .filter((r) => r.played > 0)
      .sort((a, b) =>
        sortBy === 'wins'
          ? b.wins - a.wins || b.ratio - a.ratio
          : b.ratio - a.ratio || b.wins - a.wins,
      )
  }, [players, view, sortBy])

  return (
    <section className="flex flex-col gap-4">
      {/* Filtre Tournois / Défis */}
      <div className="flex bg-zinc-800 rounded-xl p-0.5 gap-0.5">
        <ToggleBtn active={view === 'tournois'} onClick={() => setView('tournois')}>🏆 Tournois</ToggleBtn>
        <ToggleBtn active={view === 'defis'} onClick={() => setView('defis')}>⚔️ Défis</ToggleBtn>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {rows.length} joueur{rows.length > 1 ? 's' : ''}
        </h2>

        <div className="flex bg-zinc-800 rounded-xl p-0.5 gap-0.5">
          <ToggleBtn small active={sortBy === 'wins'} onClick={() => setSortBy('wins')}>Victoires</ToggleBtn>
          <ToggleBtn small active={sortBy === 'ratio'} onClick={() => setSortBy('ratio')}>% Victoire</ToggleBtn>
        </div>
      </div>

      {loading && <p className="text-zinc-600 text-sm text-center py-8">Chargement…</p>}

      {!loading && rows.length === 0 && (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-3xl mb-2">{view === 'tournois' ? '🏆' : '⚔️'}</p>
          <p>{view === 'tournois' ? 'Aucun match de tournoi joué.' : 'Aucun défi joué.'}</p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Joueur</th>
                <th className="text-center px-2 py-3">J</th>
                <th className="text-center px-2 py-3">V</th>
                <th className="text-center px-2 py-3">D</th>
                <th className="text-center px-2 py-3">%V</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                return (
                  <tr
                    key={s.key}
                    className={`border-b border-zinc-800/50 last:border-0 ${
                      i === 0 ? 'bg-yellow-500/5' : i === 1 ? 'bg-zinc-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-center">
                      {medal ? <span>{medal}</span> : <span className="text-zinc-600 text-xs font-mono">{i + 1}</span>}
                    </td>
                    <td className="px-4 py-3 min-w-0">
                      {s.id ? (
                        <Link to={`/player/${s.id}`} className="font-semibold text-white leading-tight truncate hover:text-brand transition-colors block">
                          {s.name}
                        </Link>
                      ) : (
                        <p className="font-semibold text-white leading-tight truncate">
                          {s.name}
                          <span className="text-zinc-600 text-[10px] ml-1.5">invité</span>
                        </p>
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
                          s.ratio >= 0.67 ? 'text-green-400' : s.ratio >= 0.5 ? 'text-yellow-400' : 'text-red-400'
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

      {!loading && rows.length > 0 && (
        <p className="text-zinc-700 text-xs text-center">
          J = joués · V = victoires · D = défaites · %V = ratio victoires
        </p>
      )}
    </section>
  )
}

function ToggleBtn({
  active, onClick, children, small = false,
}: { active: boolean; onClick: () => void; children: ReactNode; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${small ? 'text-xs px-3' : 'flex-1 text-sm px-4'} py-1.5 rounded-lg font-semibold transition-colors ${
        active ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  )
}

/** Vrai si ce joueur a gagné le défi (par id, sinon par nom de camp). */
function challengeWon(c: Challenge, ref: PlayerRef): boolean {
  if (c.winner_id) return !!ref.id && c.winner_id === ref.id
  return !!c.winner_name && c.winner_name === ref.name
}
