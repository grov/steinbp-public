import { useEffect, useState } from 'react'
import {
  addTable,
  addTeam,
  closeTournament,
  removeTable,
  removeTeam,
  startTournament,
  updateTableName,
  updateTeam,
} from '../../lib/tournamentActions'
import { pb, fileUrl } from '../../lib/pocketbase'
import type { RecordModel } from 'pocketbase'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PlayerSearchInput } from './PlayerSearchInput'
import type { GameTable, Team, Tournament } from '../../types/database'

type PlayerMini = { id: string; display_name: string; avatar_url: string | null }

interface SettingsTabProps {
  tournament: Tournament
  teams: Team[]
  tables: GameTable[]
  isStarted: boolean
  isFinished: boolean
  onRefresh: () => void
  onStarted: () => void
  onFinished: () => void
}

export function SettingsTab({
  tournament,
  teams,
  tables,
  isStarted,
  isFinished,
  onRefresh,
  onStarted,
  onFinished,
}: SettingsTabProps) {
  const realTeams = teams.filter((t) => !t.is_bye)

  return (
    <div className="flex flex-col gap-8">
      {!isStarted && (
        <StartTournamentButton
          tournament={tournament}
          teamCount={realTeams.length}
          onRefresh={onRefresh}
          onStarted={onStarted}
        />
      )}
      {isStarted && !isFinished && (
        <CloseTournamentButton
          tournament={tournament}
          onRefresh={onRefresh}
          onClosed={onFinished}
        />
      )}
      {isFinished && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 text-center flex flex-col items-center gap-1">
          <span className="text-3xl">🏆</span>
          <p className="font-bold text-white">Tournoi clôturé</p>
          <p className="text-zinc-500 text-sm">Ce tournoi est terminé — aucune modification possible.</p>
        </div>
      )}
      <TeamsSection teams={realTeams} tournament={tournament} isStarted={isStarted} onRefresh={onRefresh} />
      <TablesSection tables={tables} tournament={tournament} isStarted={isStarted} onRefresh={onRefresh} />
    </div>
  )
}

// ── Bouton de démarrage ───────────────────────────────────────

function StartTournamentButton({ tournament, teamCount, onRefresh, onStarted }: { tournament: Tournament; teamCount: number; onRefresh: () => void; onStarted: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canStart = teamCount >= 2

  async function handleStart() {
    setLoading(true)
    setError(null)
    try {
      await startTournament(tournament)
      onStarted()
      onRefresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du démarrage.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
      <div>
        <h2 className="font-bold text-white">Lancer le tournoi</h2>
        <p className="text-zinc-500 text-sm mt-0.5">
          {canStart
            ? `${teamCount} équipes inscrites — prêt à générer le tableau.`
            : 'Il faut au moins 2 équipes pour démarrer.'}
        </p>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button
        size="lg"
        fullWidth
        loading={loading}
        onClick={handleStart}
        disabled={!canStart}
      >
        🏆 Générer le tableau
      </Button>
    </div>
  )
}

// ── Bouton de clôture ─────────────────────────────────────────

function CloseTournamentButton({
  tournament,
  onRefresh,
  onClosed,
}: {
  tournament: Tournament
  onRefresh: () => void
  onClosed: () => void
}) {
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleClose() {
    setLoading(true)
    try {
      await closeTournament(tournament.id)
      onClosed()
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-3">
      <div>
        <h2 className="font-bold text-white">Clôturer le tournoi</h2>
        <p className="text-zinc-500 text-sm mt-0.5">
          Marque le tournoi comme terminé. L'ajout d'équipes et de tables sera définitivement verrouillé.
        </p>
      </div>
      {confirm ? (
        <div className="flex gap-2">
          <Button variant="ghost" size="lg" onClick={() => setConfirm(false)}>
            Annuler
          </Button>
          <Button size="lg" fullWidth loading={loading} onClick={handleClose}>
            Confirmer la clôture
          </Button>
        </div>
      ) : (
        <Button variant="secondary" size="lg" fullWidth onClick={() => setConfirm(true)}>
          🏁 Clôturer le tournoi
        </Button>
      )}
    </div>
  )
}

// ── Section Équipes ───────────────────────────────────────────

function TeamsSection({
  teams: propTeams,
  tournament,
  isStarted,
  onRefresh,
}: {
  teams: Team[]
  tournament: Tournament
  isStarted: boolean
  onRefresh: () => void
}) {
  const [teams, setTeams] = useState(propTeams)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [playerMap, setPlayerMap] = useState<Record<string, PlayerMini>>({})

  // Sync quand le parent reçoit des données fraîches
  useEffect(() => { setTeams(propTeams) }, [propTeams])

  useEffect(() => {
    const ids = [...new Set(
      teams.flatMap((t) => [t.player1_id, t.player2_id]).filter(Boolean) as string[]
    )]
    if (ids.length === 0) { setPlayerMap({}); return }
    pb.collection('users').getFullList({
      filter: ids.map((id) => `id = "${id}"`).join(' || '),
      fields: 'id,display_name,avatar,collectionId,collectionName',
      requestKey: null,
    }).then((records: RecordModel[]) => {
      const mapped = records.map((r) => ({
        id: r.id,
        display_name: r['display_name'] as string,
        avatar_url: fileUrl(r, r['avatar'] as string | null),
      }))
      setPlayerMap(Object.fromEntries(mapped.map((p) => [p.id, p])))
    })
  }, [teams])

  function handleAdded(newTeam: Team) {
    setTeams((prev) => [...prev, newTeam])
    setShowAddForm(false)
    onRefresh()
  }

  async function handleDelete(teamId: string) {
    await removeTeam(teamId)
    setTeams((prev) => prev.filter((t) => t.id !== teamId))
    onRefresh()
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Équipes ({teams.length})
        </h2>
        {!isStarted && !showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-brand text-sm font-semibold hover:text-brand-dark transition-colors"
          >
            + Ajouter
          </button>
        )}
      </div>

      {isStarted && (
        <div className="mb-3 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-500 text-xs">
          Le tournoi a démarré — l'ajout d'équipes est désactivé.
        </div>
      )}

      <div className="flex flex-col gap-2">
        {/* Formulaire d'ajout */}
        {showAddForm && (
          <AddTeamForm
            tournamentId={tournament.id}
            existingNames={teams.map((t) => t.name)}
            onAdded={handleAdded}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Liste des équipes */}
        {teams.map((team) =>
          editingId === team.id ? (
            <EditTeamForm
              key={team.id}
              team={team}
              existingNames={teams.filter((t) => t.id !== team.id).map((t) => t.name)}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <TeamRow
              key={team.id}
              team={team}
              playerMap={playerMap}
              onEdit={() => setEditingId(team.id)}
              onDelete={() => handleDelete(team.id)}
            />
          ),
        )}

        {teams.length === 0 && !showAddForm && (
          <p className="text-center text-zinc-600 py-6 text-sm">Aucune équipe inscrite.</p>
        )}
      </div>
    </section>
  )
}

function PlayerAvatar({ player }: { player: PlayerMini }) {
  return (
    <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 overflow-hidden flex items-center justify-center border border-zinc-600">
      {player.avatar_url ? (
        <img src={player.avatar_url} alt={player.display_name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-[10px] font-bold text-zinc-400">
          {player.display_name?.[0]?.toUpperCase() ?? '?'}
        </span>
      )}
    </div>
  )
}

function TeamRow({
  team,
  playerMap,
  onEdit,
  onDelete,
}: {
  team: Team
  playerMap: Record<string, PlayerMini>
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const p1 = team.player1_id ? playerMap[team.player1_id] : null
  const p2 = team.player2_id ? playerMap[team.player2_id] : null

  return (
    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{team.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {p1 && <PlayerAvatar player={p1} />}
          <span className="text-zinc-500 text-xs truncate">
            {[team.player1_name, team.player2_name].filter(Boolean).join(' & ')}
          </span>
          {p2 && <PlayerAvatar player={p2} />}
        </div>
      </div>

      <button
        onClick={onEdit}
        className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg min-h-touch min-w-[2.5rem] flex items-center justify-center"
        aria-label="Modifier"
      >
        ✏️
      </button>

      {confirmDelete ? (
        <div className="flex gap-1">
          <button
            onClick={() => { onDelete(); setConfirmDelete(false) }}
            className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
          >
            Confirmer
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
          className="text-zinc-600 hover:text-red-400 transition-colors p-2 rounded-lg min-h-touch min-w-[2.5rem] flex items-center justify-center"
          aria-label="Supprimer"
        >
          🗑
        </button>
      )}
    </div>
  )
}

function EditTeamForm({
  team,
  existingNames,
  onDone,
}: {
  team: Team
  existingNames: string[]
  onDone: () => void
}) {
  const [name, setName] = useState(team.name)
  const [p1, setP1] = useState(team.player1_name)
  const [p1Id, setP1Id] = useState<string | null>(team.player1_id ?? null)
  const [p2, setP2] = useState(team.player2_name)
  const [p2Id, setP2Id] = useState<string | null>(team.player2_id ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) { setError('Nom requis.'); return }
    if (!p1.trim()) { setError('Joueur 1 requis.'); return }
    if (existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase())) {
      setError('Ce nom est déjà pris.')
      return
    }
    setLoading(true)
    try {
      await updateTeam(team.id, {
        name: name.trim(),
        player1_name: p1.trim(),
        player2_name: p2.trim(),
        player1_id: p1Id,
        player2_id: p2Id,
      })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-800 border border-brand/30 rounded-xl p-4 flex flex-col gap-3">
      <Input label="Nom de l'équipe" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <PlayerSearchInput
          label="Joueur 1"
          name={p1}
          playerId={p1Id}
          onChangeName={setP1}
          onSelectPlayer={(p) => { setP1Id(p?.id ?? null); if (p) setP1(p.display_name) }}
        />
        <PlayerSearchInput
          label="Joueur 2 (optionnel)"
          name={p2}
          playerId={p2Id}
          onChangeName={setP2}
          onSelectPlayer={(p) => { setP2Id(p?.id ?? null); if (p) setP2(p.display_name) }}
          placeholder="Optionnel…"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>Annuler</Button>
        <Button size="sm" fullWidth loading={loading} onClick={handleSave}>Enregistrer</Button>
      </div>
    </div>
  )
}

function AddTeamForm({
  tournamentId,
  existingNames,
  onAdded,
  onCancel,
}: {
  tournamentId: string
  existingNames: string[]
  onAdded: (team: Team) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [p1, setP1] = useState('')
  const [p1Id, setP1Id] = useState<string | null>(null)
  const [p2, setP2] = useState('')
  const [p2Id, setP2Id] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!name.trim()) { setError('Nom requis.'); return }
    if (!p1.trim()) { setError('Joueur 1 requis.'); return }
    if (existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase())) {
      setError('Ce nom est déjà pris.')
      return
    }
    setLoading(true)
    try {
      const newTeam = await addTeam({
        tournament_id: tournamentId,
        name: name.trim(),
        player1_name: p1.trim(),
        player2_name: p2.trim(),
        player1_id: p1Id,
        player2_id: p2Id,
      })
      onAdded(newTeam as Team)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'ajout.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-800 border border-brand/30 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-sm font-bold text-zinc-300">Nouvelle équipe</p>
      <Input label="Nom de l'équipe" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <PlayerSearchInput
          label="Joueur 1"
          name={p1}
          playerId={p1Id}
          onChangeName={setP1}
          onSelectPlayer={(p) => { setP1Id(p?.id ?? null); if (p) setP1(p.display_name) }}
        />
        <PlayerSearchInput
          label="Joueur 2 (optionnel)"
          name={p2}
          playerId={p2Id}
          onChangeName={setP2}
          onSelectPlayer={(p) => { setP2Id(p?.id ?? null); if (p) setP2(p.display_name) }}
          placeholder="Optionnel…"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
        <Button size="sm" fullWidth loading={loading} onClick={handleAdd}>Ajouter</Button>
      </div>
    </div>
  )
}

// ── Section Tables ────────────────────────────────────────────

function TablesSection({
  tables: propTables,
  tournament,
  isStarted,
  onRefresh,
}: {
  tables: GameTable[]
  tournament: Tournament
  isStarted: boolean
  onRefresh: () => void
}) {
  const [tables, setTables] = useState(propTables)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newTableName, setNewTableName] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  useEffect(() => { setTables(propTables) }, [propTables])

  async function handleAddTable() {
    const name = newTableName.trim() || `Table ${tables.length + 1}`
    if (tables.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setAddError('Ce nom est déjà utilisé.')
      return
    }
    setAddLoading(true)
    setAddError(null)
    try {
      const { data } = await addTable(tournament.id, name)
      if (data) setTables((prev) => [...prev, data as GameTable])
      setNewTableName('')
      onRefresh()
    } catch {
      setAddError('Erreur lors de l\'ajout.')
    } finally {
      setAddLoading(false)
    }
  }

  async function handleDelete(tableId: string) {
    await removeTable(tableId)
    setTables((prev) => prev.filter((t) => t.id !== tableId))
    onRefresh()
  }

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
        Tables ({tables.length})
      </h2>

      <div className="flex flex-col gap-2">
        {tables.map((table) =>
          editingId === table.id ? (
            <EditTableRow
              key={table.id}
              table={table}
              existingNames={tables.filter((t) => t.id !== table.id).map((t) => t.name)}
              onDone={() => setEditingId(null)}
            />
          ) : (
            <TableRow
              key={table.id}
              table={table}
              onEdit={() => setEditingId(table.id)}
              onDelete={() => handleDelete(table.id)}
            />
          ),
        )}

        {/* Formulaire d'ajout */}
        {isStarted ? (
          <div className="mt-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-500 text-xs">
            Le tournoi a démarré — l'ajout de tables est désactivé.
          </div>
        ) : (
          <>
            <div className="flex gap-2 mt-1">
              <input
                value={newTableName}
                onChange={(e) => { setNewTableName(e.target.value); setAddError(null) }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
                placeholder={`Table ${tables.length + 1}`}
                className="flex-1 rounded-xl bg-zinc-800 border border-zinc-700 text-white
                           placeholder-zinc-600 px-4 py-3 text-sm focus:outline-none
                           focus:ring-2 focus:ring-brand focus:border-transparent"
              />
              <Button size="md" loading={addLoading} onClick={handleAddTable}>
                + Table
              </Button>
            </div>
            {addError && <p className="text-red-400 text-xs">{addError}</p>}
          </>
        )}
      </div>
    </section>
  )
}

function TableRow({
  table,
  onEdit,
  onDelete,
}: {
  table: GameTable
  onEdit: () => void
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 gap-3">
      <div className="flex-1">
        <p className="font-semibold text-white">{table.name}</p>
      </div>

      <span
        className={`text-xs font-medium px-2 py-1 rounded-full ${
          table.is_available
            ? 'bg-green-500/15 text-green-400'
            : 'bg-red-500/15 text-red-400'
        }`}
      >
        {table.is_available ? 'Libre' : 'En jeu'}
      </span>

      <button
        onClick={onEdit}
        className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg min-h-touch min-w-[2.5rem] flex items-center justify-center"
      >
        ✏️
      </button>

      {confirmDelete ? (
        <div className="flex gap-1">
          <button
            onClick={() => { onDelete(); setConfirmDelete(false) }}
            className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all"
          >
            Confirmer
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
          className="text-zinc-600 hover:text-red-400 transition-colors p-2 rounded-lg min-h-touch min-w-[2.5rem] flex items-center justify-center"
        >
          🗑
        </button>
      )}
    </div>
  )
}

function EditTableRow({
  table,
  existingNames,
  onDone,
}: {
  table: GameTable
  existingNames: string[]
  onDone: () => void
}) {
  const [name, setName] = useState(table.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!name.trim()) { setError('Nom requis.'); return }
    if (existingNames.some((n) => n.toLowerCase() === name.trim().toLowerCase())) {
      setError('Ce nom est déjà utilisé.')
      return
    }
    setLoading(true)
    try {
      await updateTableName(table.id, name.trim())
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zinc-800 border border-brand/30 rounded-xl p-3 flex gap-2 items-end">
      <div className="flex-1">
        <Input
          label="Nom de la table"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          error={error ?? undefined}
          autoFocus
        />
      </div>
      <Button variant="ghost" size="md" onClick={onDone}>✕</Button>
      <Button size="md" loading={loading} onClick={handleSave}>✓</Button>
    </div>
  )
}
