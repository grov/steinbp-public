import { useEffect, useState } from 'react'
import {
  adminUpdatePlayer,
  approvePlayer,
  deletePlayer,
  fetchAllPlayers,
  rejectPlayer,
} from '../../lib/playerActions'
import type { Player, PlayerRole, PlayerStatus } from '../../types/database'

const ROLE_STYLE: Record<PlayerRole, string> = {
  admin:        'bg-brand/20 text-brand',
  organisateur: 'bg-blue-500/15 text-blue-400',
  joueur:       'bg-zinc-700/50 text-zinc-500',
}

const ROLE_LABEL: Record<PlayerRole, string> = {
  admin:        'Admin',
  organisateur: 'Organisateur',
  joueur:       'Joueur',
}

const STATUS_STYLE: Record<PlayerStatus, string> = {
  pending:  'bg-yellow-500/15 text-yellow-400',
  approved: 'bg-green-500/15 text-green-400',
  rejected: 'bg-zinc-700 text-zinc-500',
}

const STATUS_LABEL: Record<PlayerStatus, string> = {
  pending:  'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
}

const STATUS_ORDER: Record<PlayerStatus, number> = {
  pending:  0,
  approved: 1,
  rejected: 2,
}

function sortPlayers(list: Player[]): Player[] {
  return [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])
}

export function PlayersPanel({ onPendingCount }: { onPendingCount?: (count: number) => void }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    fetchAllPlayers()
      .then((data) => {
        setPlayers(data)
        onPendingCount?.(data.filter((p) => p.status === 'pending').length)
      })
      .catch((e: unknown) => { if (!(e as { isAbort?: boolean })?.isAbort) console.error(e) })
      .finally(() => setLoading(false))
  }, [])

  function applyUpdate(updated: Player) {
    setPlayers((prev) => {
      const next = sortPlayers(prev.map((p) => (p.id === updated.id ? updated : p)))
      onPendingCount?.(next.filter((p) => p.status === 'pending').length)
      return next
    })
  }

  function handleDeleted(id: string) {
    setPlayers((prev) => {
      const next = prev.filter((p) => p.id !== id)
      onPendingCount?.(next.filter((p) => p.status === 'pending').length)
      return next
    })
  }

  function handleUpdated(updated: Player) {
    applyUpdate(updated)
    setEditingId(null)
  }

  if (loading) {
    return <p className="text-zinc-600 text-sm text-center py-8">Chargement…</p>
  }

  if (players.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-600">
        <p className="text-3xl mb-2">👥</p>
        <p>Aucun joueur inscrit.</p>
      </div>
    )
  }

  const pendingCount = players.filter((p) => p.status === 'pending').length

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
        Joueurs ({players.length})
        {pendingCount > 0 && (
          <span className="ml-2 bg-yellow-500/20 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
            {pendingCount} en attente
          </span>
        )}
      </h2>
      <div className="flex flex-col gap-2">
        {players.map((player) =>
          editingId === player.id ? (
            <PlayerEditForm
              key={player.id}
              player={player}
              onSaved={handleUpdated}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <PlayerRow
              key={player.id}
              player={player}
              onEdit={() => setEditingId(player.id)}
              onDeleted={() => handleDeleted(player.id)}
              onStatusChanged={applyUpdate}
            />
          ),
        )}
      </div>
    </section>
  )
}

// ── Ligne joueur ──────────────────────────────────────────────

function PlayerRow({
  player,
  onEdit,
  onDeleted,
  onStatusChanged,
}: {
  player: Player
  onEdit: () => void
  onDeleted: () => void
  onStatusChanged: (updated: Player) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actioning, setActioning] = useState(false)

  async function handleApprove() {
    setActioning(true)
    try {
      await approvePlayer(player.id)
      onStatusChanged({ ...player, status: 'approved' })
    } finally {
      setActioning(false)
    }
  }

  async function handleReject() {
    setActioning(true)
    try {
      await rejectPlayer(player.id)
      onStatusChanged({ ...player, status: 'rejected' })
    } finally {
      setActioning(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deletePlayer(player.id)
      onDeleted()
    } catch {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {player.avatar_url ? (
          <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-zinc-400">
            {player.display_name?.[0]?.toUpperCase() ?? '?'}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{player.display_name}</p>
        <p className="text-zinc-500 text-xs">@{player.username}</p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLE[player.status]}`}>
          {STATUS_LABEL[player.status]}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_STYLE[player.role]}`}>
          {ROLE_LABEL[player.role]}
        </span>
      </div>

      {player.status === 'pending' ? (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleApprove}
            disabled={actioning}
            className="bg-green-600 hover:bg-green-500 text-white text-sm font-bold px-3 py-2 rounded-xl active:scale-95 transition-all min-h-touch disabled:opacity-50"
            aria-label="Approuver"
          >
            ✓
          </button>
          <button
            onClick={handleReject}
            disabled={actioning}
            className="bg-zinc-700 hover:bg-red-600 text-zinc-300 hover:text-white text-sm font-bold px-3 py-2 rounded-xl active:scale-95 transition-all min-h-touch disabled:opacity-50"
            aria-label="Refuser"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={onEdit}
            className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg flex-shrink-0"
            aria-label="Modifier"
          >
            ✏️
          </button>

          {confirmDelete ? (
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {deleting ? '…' : 'Confirmer'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="bg-zinc-700 text-zinc-300 text-xs px-2 py-1.5 rounded-lg"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-zinc-600 hover:text-red-400 transition-colors p-2 rounded-lg flex-shrink-0"
              aria-label="Supprimer"
            >
              🗑
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Formulaire d'édition inline ───────────────────────────────

function PlayerEditForm({
  player,
  onSaved,
  onCancel,
}: {
  player: Player
  onSaved: (updated: Player) => void
  onCancel: () => void
}) {
  const [displayName, setDisplayName] = useState(player.display_name)
  const [username, setUsername] = useState(player.username)
  const [status, setStatus] = useState<PlayerStatus>(player.status)
  const [role, setRole] = useState<PlayerRole>(player.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!displayName.trim()) { setError('Nom affiché requis.'); return }
    if (!username.trim()) { setError('Pseudo requis.'); return }
    setSaving(true)
    setError(null)
    try {
      const updated = await adminUpdatePlayer(player.id, {
        display_name: displayName.trim(),
        username: username.trim(),
        status,
        role,
      })
      onSaved(updated)
    } catch (e) {
      setError((e as { message?: string })?.message ?? 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-zinc-800 border border-brand/30 rounded-xl p-4 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Nom affiché</span>
          <input
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setError(null) }}
            className="rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Pseudo</span>
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(null) }}
            className="rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            autoCapitalize="none"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Statut</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PlayerStatus)}
            className="rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          >
            <option value="pending">En attente</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Refusé</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-400">Rôle</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as PlayerRole)}
            className="rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2
                       focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          >
            <option value="joueur">Joueur</option>
            <option value="organisateur">Organisateur</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="text-red-400 text-xs">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 text-sm font-semibold text-white bg-brand hover:bg-brand-dark rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
