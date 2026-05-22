import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../../lib/pocketbase'
import { deleteTournament } from '../../lib/tournamentActions'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../ui/Button'
import { TournamentStatusBadge } from '../ui/Badge'
import type { Tournament } from '../../types/database'

interface TournamentRow extends Tournament {
  winner_name?: string
}

export function TournamentsPanel() {
  const navigate = useNavigate()
  const { isAdmin, session } = useAuth()
  const [tournaments, setTournaments] = useState<TournamentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(id: string) {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteTournament(id)
      setTournaments((prev) => prev.filter((t) => t.id !== id))
      setConfirmDeleteId(null)
    } catch (e) {
      setDeleteError((e as Error).message ?? 'Erreur lors de la suppression.')
      setConfirmDeleteId(null)
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    let active = true

    async function load() {
      const filter = !isAdmin && session?.userId
        ? `created_by = "${session.userId}"`
        : undefined

      const result = await pb.collection('tournaments').getList(1, 50, {
        filter,
        sort: '-id',
        requestKey: null,
      })

      if (!active) return

      const tourData = result.items

      if (!tourData.length) {
        setTournaments([])
        setLoading(false)
        return
      }

      const finishedIds = tourData
        .filter((t) => t['status'] === 'finished')
        .map((t) => t.id)

      let winnerMap: Record<string, string> = {}

      if (finishedIds.length > 0) {
        const tournamentFilter = finishedIds.map((id) => `tournament_id = "${id}"`).join(' || ')
        const finals = await pb.collection('matches').getFullList({
          filter: `(${tournamentFilter}) && phase = "bracket" && next_match_id = "" && status = "finished" && winner_id != ""`,
          fields: 'tournament_id,winner_id',
          requestKey: null,
        })

        if (finals.length) {
          const winnerIds = finals.map((f) => f['winner_id'] as string).filter(Boolean)
          const teams = winnerIds.length
            ? await pb.collection('teams').getFullList({
                filter: winnerIds.map((id) => `id = "${id}"`).join(' || '),
                fields: 'id,name',
                requestKey: null,
              })
            : []

          const teamMap = Object.fromEntries(teams.map((t) => [t.id, t['name'] as string]))
          winnerMap = Object.fromEntries(
            finals.map((f) => [f['tournament_id'] as string, teamMap[f['winner_id'] as string]]),
          )
        }
      }

      if (!active) return

      const rows: TournamentRow[] = tourData.map((t) => ({
        id: t.id,
        name: t['name'] as string,
        format: t['format'] as Tournament['format'],
        status: t['status'] as Tournament['status'],
        num_tables: t['num_tables'] as number,
        cups_per_side: t['cups_per_side'] as number,
        groups_count: (t['groups_count'] as number | null) || null,
        teams_advance_per_group: (t['teams_advance_per_group'] as number | null) || null,
        created_by: (t['created_by'] as string) || null,
        created: t.created,
        updated: t.updated,
        winner_name: winnerMap[t.id],
      }))

      setTournaments(rows)
      setLoading(false)
    }

    const safeLoad = () =>
      load().catch((e: unknown) => {
        if (!(e as { isAbort?: boolean })?.isAbort) console.error(e)
      })

    safeLoad()

    pb.collection('tournaments').subscribe('*', safeLoad)

    return () => {
      active = false
      pb.collection('tournaments').unsubscribe()
    }
  }, [isAdmin, session?.userId])

  return (
    <section className="flex flex-col gap-4">
      <Button size="lg" fullWidth onClick={() => navigate('/create')}>
        + Nouveau tournoi
      </Button>

      {deleteError && (
        <div className="bg-red-900/30 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">
          {deleteError}
        </div>
      )}

      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        Tournois récents
      </h2>

      {loading && (
        <p className="text-zinc-600 text-sm text-center py-8">Chargement…</p>
      )}

      {!loading && tournaments.length === 0 && (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-3xl mb-2">🎯</p>
          <p>Aucun tournoi pour l'instant.</p>
          <p className="text-sm mt-1">Crée ton premier tournoi !</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {tournaments.map((t) => (
          <div
            key={t.id}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-start gap-3
                       hover:border-zinc-700 transition-colors"
          >
            <button
              onClick={() => navigate(`/tournament/${t.id}`)}
              className="flex-1 text-left min-w-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-white text-lg leading-tight truncate">{t.name}</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {t.format === 'single_elimination' ? 'Élimination directe' : 'Poules + arbre'}
                    {' · '}
                    {t.num_tables} table{t.num_tables > 1 ? 's' : ''}
                  </p>
                  {t.winner_name && (
                    <p className="text-yellow-400 text-xs mt-1.5 font-medium">
                      🏆 {t.winner_name}
                    </p>
                  )}
                </div>
                <TournamentStatusBadge status={t.status} />
              </div>
            </button>

            {confirmDeleteId === t.id ? (
              <div className="flex gap-1 flex-shrink-0 items-center">
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? '…' : 'Confirmer'}
                </button>
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="bg-zinc-700 text-zinc-300 text-xs px-2 py-1.5 rounded-lg"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDeleteId(t.id)}
                className="text-zinc-600 hover:text-red-400 transition-colors p-2 rounded-lg flex-shrink-0"
                aria-label="Supprimer"
              >
                🗑
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
