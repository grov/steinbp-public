import { useEffect, useState } from 'react'
import { approvePlayer, fetchPendingPlayers, rejectPlayer } from '../../lib/playerActions'
import type { Player } from '../../types/database'

export function RegistrationsPanel() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setPlayers(await fetchPendingPlayers())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleApprove(id: string) {
    await approvePlayer(id)
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleReject(id: string) {
    await rejectPlayer(id)
    setPlayers((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
        Inscriptions en attente
        {players.length > 0 && (
          <span className="ml-2 bg-brand text-white text-xs font-black px-1.5 py-0.5 rounded-full">
            {players.length}
          </span>
        )}
      </h2>

      {loading && (
        <p className="text-zinc-600 text-sm text-center py-4">Chargement…</p>
      )}

      {!loading && players.length === 0 && (
        <p className="text-zinc-600 text-sm text-center py-6">
          Aucune inscription en attente.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {players.map((player) => (
          <div
            key={player.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            {/* Avatar placeholder */}
            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg flex-shrink-0">
              {player.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{player.display_name}</p>
              <p className="text-zinc-500 text-xs">@{player.username}</p>
              <p className="text-zinc-600 text-xs mt-0.5">
                {new Date(player.created).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => handleApprove(player.id)}
                className="bg-green-600 hover:bg-green-500 text-white text-sm font-bold
                           px-3 py-2 rounded-xl active:scale-95 transition-all min-h-touch"
              >
                ✓
              </button>
              <button
                onClick={() => handleReject(player.id)}
                className="bg-zinc-700 hover:bg-red-600 text-zinc-300 hover:text-white text-sm font-bold
                           px-3 py-2 rounded-xl active:scale-95 transition-all min-h-touch"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
