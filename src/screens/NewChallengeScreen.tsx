import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { PlayerSearchInput } from '../components/tournament/PlayerSearchInput'
import { TrickAttributionPanel, type TrickSlot } from '../components/tournament/TrickAttributionPanel'
import { createChallenge, fetchChallenge, updateChallenge } from '../lib/challengeActions'
import type { Challenge, TrickEvent } from '../types/database'

type WinnerSide = 'self' | 'opponent'

export function NewChallengeScreen() {
  const { player } = useAuth()
  const navigate = useNavigate()
  // Avec un id dans l'URL, l'écran modifie un défi existant
  const { id: editId } = useParams<{ id: string }>()

  const [opponentName, setOpponentName] = useState('')
  const [opponentId, setOpponentId] = useState<string | null>(null)
  const [winner, setWinner] = useState<WinnerSide | null>(null)
  const [trickEvents, setTrickEvents] = useState<TrickEvent[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Challenge | null>(null)

  useEffect(() => {
    if (!editId) return
    fetchChallenge(editId)
      .then((c) => {
        setEditing(c)
        setOpponentName(c.player2_name)
        setOpponentId(c.player2_id)
        const p1Won = c.winner_id ? c.winner_id === c.player1_id : c.winner_name === c.player1_name
        setWinner(p1Won ? 'self' : 'opponent')
        setTrickEvents(c.trick_events)
      })
      .catch(() => setError('Défi introuvable.'))
  }, [editId])

  if (!player) return null

  if (editId && !editing) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        {error ? (
          <>
            <p className="text-red-400 text-sm">{error}</p>
            <Link to="/challenges" className="text-zinc-400 hover:text-white text-sm">← Retour aux défis</Link>
          </>
        ) : (
          <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    )
  }

  // En modification, le joueur 1 reste celui du défi d'origine
  const selfId = editing?.player1_id ?? player.id
  const selfName = editing?.player1_name ?? player.display_name
  const opponentReady = opponentName.trim().length > 0
  const canSave = opponentReady && winner !== null && !saving

  const slots: TrickSlot[] = opponentReady
    ? [
        { key: selfId, player_id: selfId, name: selfName },
        { key: opponentId ?? 'opponent', player_id: opponentId, name: opponentName.trim() },
      ]
    : []

  async function handleSave() {
    if (!player || !winner || !opponentReady) return
    setSaving(true)
    setError(null)
    // Ne garde que les tricks des deux joueurs actuels (l'adversaire a pu changer)
    const opp = opponentName.trim()
    const events = trickEvents.filter((e) =>
      e.player_id
        ? e.player_id === selfId || e.player_id === opponentId
        : !opponentId && e.player_name === opp,
    )
    const payload = {
      player1_id: selfId,
      player2_id: opponentId,
      player1_name: selfName,
      player2_name: opp,
      winner_id: winner === 'self' ? selfId : opponentId,
      winner_name: winner === 'self' ? selfName : opp,
      trick_events: events,
      created_by: editing?.created_by ?? player.id,
    }
    try {
      if (editing) await updateChallenge(editing.id, payload)
      else await createChallenge(payload)
      navigate('/challenges')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement du défi.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link to="/challenges" className="text-zinc-400 hover:text-white transition-colors text-sm">
            ← Retour
          </Link>
          <h1 className="text-xl font-black text-brand flex items-center gap-2">⚔️ {editing ? 'Modifier le défi' : 'Nouveau défi'}</h1>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* Adversaire */}
        <section className="flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Adversaire</p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
            <p className="text-sm text-zinc-400">
              <span className="text-white font-semibold">{selfName}</span> affronte…
            </p>
          </div>
          <PlayerSearchInput
            label="Rechercher un joueur (ou saisir un nom libre)"
            name={opponentName}
            playerId={opponentId}
            onChangeName={setOpponentName}
            onSelectPlayer={(p) => setOpponentId(p?.id ?? null)}
            placeholder="Nom de l'adversaire…"
          />
          {opponentReady && !opponentId && (
            <p className="text-[11px] text-zinc-600">
              Joueur invité : le défi ne comptera pas dans ses statistiques.
            </p>
          )}
        </section>

        {/* Vainqueur */}
        {opponentReady && (
          <section className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Vainqueur</p>
            <div className="grid grid-cols-2 gap-3">
              <WinnerButton label={selfName} active={winner === 'self'} onClick={() => setWinner('self')} />
              <WinnerButton label={opponentName.trim()} active={winner === 'opponent'} onClick={() => setWinner('opponent')} />
            </div>
          </section>
        )}

        {/* Tricks */}
        {opponentReady && (
          <section className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Qui a fait quoi ?</p>
            <TrickAttributionPanel slots={slots} events={trickEvents} onChange={setTrickEvents} />
          </section>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button size="lg" fullWidth loading={saving} disabled={!canSave} onClick={handleSave}>
          {editing ? 'Enregistrer les modifications' : 'Enregistrer le défi'}
        </Button>
      </div>
    </div>
  )
}

function WinnerButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-4 py-4 text-center font-bold transition-all
        ${active
          ? 'bg-brand/15 border-brand text-white'
          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
        }`}
    >
      {active && <span className="mr-1.5">🏆</span>}
      <span className="truncate">{label}</span>
    </button>
  )
}
