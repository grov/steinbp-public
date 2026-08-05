import { useNavigate, useParams } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { BracketView } from '../components/tournament/BracketView'
import { TournamentStatusBadge } from '../components/ui/Badge'

export function TournamentViewScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tournament, teams, matches, loading } = useTournament(id)

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">
        Chargement…
      </div>
    )
  }

  const realTeams = teams.filter((t) => !t.is_bye)

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => navigate('/my-tournaments')}
              className="text-zinc-500 hover:text-white transition-colors text-sm"
            >
              ←
            </button>
            <h1 className="text-xl font-bold">{tournament.name}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <TournamentStatusBadge status={tournament.status} />
            <span>{realTeams.length} équipes</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <BracketView matches={matches} />
        </div>
      </main>
    </div>
  )
}
