import { useParams } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { BracketView } from '../components/tournament/BracketView'
import { GroupStandings } from '../components/tournament/GroupStandings'
import type { MatchWithRelations } from '../types/database'

/**
 * Écran public (TV / tablette en salle).
 * Lecture seule, temps réel via Supabase Realtime.
 * Optimisé pour une lecture à distance : texte grand, contraste élevé.
 */
export function PublicDisplayScreen() {
  const { id } = useParams<{ id: string }>()
  const { tournament, matches, groups, loading } = useTournament(id)

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-zinc-600 text-2xl">
        Chargement…
      </div>
    )
  }

  const inProgress = matches.filter((m) => m.status === 'in_progress')
  const upNext = matches.filter((m) => m.status === 'ready').slice(0, 6)

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo-banner.png" alt="SteinBP" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-black text-brand">SteinBP</span>
          </div>
          <span className="text-zinc-400 text-xl">|</span>
          <span className="text-white text-xl font-bold">{tournament.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-sm font-medium">LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-[calc(100vh-5rem)]">
        {/* Colonne gauche : matchs en cours */}
        <div className="lg:col-span-1 bg-zinc-950 border-r border-zinc-800 overflow-y-auto p-6">
          <h2 className="text-green-400 font-black text-lg uppercase tracking-widest mb-4">
            ⚡ En cours
          </h2>

          {inProgress.length === 0 ? (
            <p className="text-zinc-700 text-center py-8">Aucun match en cours</p>
          ) : (
            <div className="flex flex-col gap-4">
              {inProgress.map((m) => (
                <LiveMatchCard key={m.id} match={m} />
              ))}
            </div>
          )}

          <h2 className="text-yellow-400 font-black text-lg uppercase tracking-widest mt-8 mb-4">
            🔜 Prochains
          </h2>

          {upNext.length === 0 ? (
            <p className="text-zinc-700 text-center py-4">Aucun match en attente</p>
          ) : (
            <div className="flex flex-col gap-3">
              {upNext.map((m) => (
                <UpNextCard key={m.id} match={m} />
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite : bracket ou classements */}
        <div className="lg:col-span-2 overflow-y-auto p-6">
          {tournament.status === 'group_phase' ? (
            <>
              <h2 className="text-white font-black text-xl mb-5">Classements des groupes</h2>
              <GroupStandings groups={groups} />
            </>
          ) : (
            <>
              <h2 className="text-white font-black text-xl mb-5">Tableau</h2>
              <BracketView matches={matches} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function LiveMatchCard({ match }: { match: MatchWithRelations }) {
  return (
    <div className="bg-zinc-900 border border-green-500/30 rounded-2xl overflow-hidden">
      {match.table && (
        <div className="bg-green-500/10 px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-300 font-bold text-sm">{match.table.name}</span>
        </div>
      )}
      <div className="flex items-center p-4 gap-4">
        <TeamName name={match.team1?.name} players={[match.team1?.player1_name, match.team1?.player2_name]} />
        <span className="text-zinc-600 font-black text-xl flex-shrink-0">VS</span>
        <TeamName name={match.team2?.name} players={[match.team2?.player1_name, match.team2?.player2_name]} right />
      </div>
    </div>
  )
}

function UpNextCard({ match }: { match: MatchWithRelations }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
      <span className="text-zinc-300 font-bold flex-1 truncate">{match.team1?.name ?? '?'}</span>
      <span className="text-zinc-600 text-xs">vs</span>
      <span className="text-zinc-300 font-bold flex-1 truncate text-right">{match.team2?.name ?? '?'}</span>
    </div>
  )
}

function TeamName({
  name,
  players,
  right = false,
}: {
  name?: string
  players: (string | undefined)[]
  right?: boolean
}) {
  return (
    <div className={`flex-1 ${right ? 'text-right' : 'text-left'}`}>
      <p className="text-white font-black text-lg leading-tight">{name ?? '?'}</p>
      <p className="text-zinc-500 text-xs mt-0.5">{players.filter(Boolean).join(' & ')}</p>
    </div>
  )
}
