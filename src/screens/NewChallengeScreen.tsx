import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { PlayerSearchInput } from '../components/tournament/PlayerSearchInput'
import { TrickAttributionPanel, type TrickSlot } from '../components/tournament/TrickAttributionPanel'
import { createChallenge } from '../lib/challengeActions'
import type { TrickEvent } from '../types/database'

type WinnerSide = 'self' | 'opponent'

export function NewChallengeScreen() {
  const { player } = useAuth()
  const navigate = useNavigate()

  const [opponentName, setOpponentName] = useState('')
  const [opponentId, setOpponentId] = useState<string | null>(null)
  const [winner, setWinner] = useState<WinnerSide | null>(null)
  const [trickEvents, setTrickEvents] = useState<TrickEvent[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!player) return null

  const selfName = player.display_name
  const opponentReady = opponentName.trim().length > 0
  const canSave = opponentReady && winner !== null && !saving

  const slots: TrickSlot[] = opponentReady
    ? [
        { key: player.id, player_id: player.id, name: selfName },
        { key: opponentId ?? 'opponent', player_id: opponentId, name: opponentName.trim() },
      ]
    : []

  async function handleSave() {
    if (!player || !winner || !opponentReady) return
    setSaving(true)
    setError(null)
    try {
      await createChallenge({
        player1_id: player.id,
        player2_id: opponentId,
        player1_name: selfName,
        player2_name: opponentName.trim(),
        winner_id: winner === 'self' ? player.id : opponentId,
        winner_name: winner === 'self' ? selfName : opponentName.trim(),
        trick_events: trickEvents,
        created_by: player.id,
      })
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
          <h1 className="text-xl font-black text-brand flex items-center gap-2">⚔️ Nouveau défi</h1>
          <Link
            to="/challenges"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            Annuler
          </Link>
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
          Enregistrer le défi
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
