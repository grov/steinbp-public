import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPlayerTournaments, type PlayerTournament } from '../lib/playerActions'

const STATUS_LABEL: Record<string, string> = {
  registration: 'Inscriptions',
  group_phase: 'Groupes',
  bracket_phase: 'Finales',
  finished: 'Terminé',
}

export function MyTournamentsScreen() {
  const { player } = useAuth()
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState<PlayerTournament[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!player) return
    let active = true
    fetchPlayerTournaments(player.id)
      .then((pt) => { if (active) setTournaments(pt) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [player])

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          ← Retour
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold mb-5">Mes tournois</h1>

        {loading ? (
          <p className="text-zinc-600 text-center py-8">Chargement…</p>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-12 text-zinc-600">
            <p className="text-4xl mb-3">🏓</p>
            <p>Aucun tournoi pour le moment.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tournaments.map(({ tournament, teamName, won }) => (
              <Link
                key={tournament.id}
                to={`/my-tournaments/${tournament.id}`}
                className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 transition-colors
                  ${won
                    ? 'bg-brand/10 border-brand/25 hover:bg-brand/15'
                    : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'
                  }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {won && <span className="mr-1.5">🏆</span>}
                    {tournament.name}
                  </p>
                  <p className="text-zinc-500 text-xs mt-0.5 truncate">{teamName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                    ${tournament.status === 'finished'
                      ? 'bg-zinc-800 text-zinc-400'
                      : 'bg-blue-900/50 text-blue-300'
                    }`}
                  >
                    {STATUS_LABEL[tournament.status] ?? tournament.status}
                  </span>
                  <span className="text-zinc-600 text-sm">›</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
