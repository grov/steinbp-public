import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { MatchWithRelations, SpecialEvents } from '../../types/database'

interface ScoreModalProps {
  match: MatchWithRelations | null
  cupsPerSide: number
  onConfirm: (winnerId: string, cupsRemaining: number, specialEvents: SpecialEvents) => Promise<void>
  onClose: () => void
  editMode?: boolean
}

type Step = 'winner' | 'cups'

const DEFAULT_SPECIAL_EVENTS: SpecialEvents = {
  game_over: false,
  balls_back_count: 0,
  bounce_count: 0,
  trickshot_count: 0,
}

export function ScoreModal({ match, cupsPerSide, onConfirm, onClose, editMode = false }: ScoreModalProps) {
  const [step, setStep] = useState<Step>(() =>
    editMode && match?.winner_id ? 'cups' : 'winner',
  )
  const [winnerId, setWinnerId] = useState<string | null>(() =>
    editMode ? (match?.winner_id ?? null) : null,
  )
  const [cups, setCups] = useState<number>(() =>
    editMode && match?.winner_cups_remaining != null ? match.winner_cups_remaining : 1,
  )
  const [specialEvents, setSpecialEvents] = useState<SpecialEvents>(() =>
    editMode && match
      ? {
          game_over: match.game_over ?? false,
          balls_back_count: match.balls_back_count ?? 0,
          bounce_count: match.bounce_count ?? 0,
          trickshot_count: match.trickshot_count ?? 0,
        }
      : { ...DEFAULT_SPECIAL_EVENTS },
  )
  const [loading, setLoading] = useState(false)

  if (!match) return null

  const { team1, team2 } = match

  function handleSelectWinner(id: string) {
    setWinnerId(id)
    setCups(1)
    setStep('cups')
  }

  async function handleConfirm() {
    if (!winnerId) return
    setLoading(true)
    try {
      await onConfirm(winnerId, cups, specialEvents)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep('winner')
    setWinnerId(null)
    setCups(1)
    setSpecialEvents({ ...DEFAULT_SPECIAL_EVENTS })
    onClose()
  }

  function updateEvent<K extends keyof SpecialEvents>(key: K, value: SpecialEvents[K]) {
    setSpecialEvents((prev) => ({ ...prev, [key]: value }))
  }

  const winnerTeam = winnerId === team1?.id ? team1 : team2

  return (
    <Modal open={!!match} onClose={handleClose} title={editMode ? 'Modifier le score' : 'Saisir le score'}>
      {step === 'winner' && (
        <div className="flex flex-col gap-4">
          <p className="text-zinc-400 text-center">Qui a gagné ce match ?</p>

          <Button
            variant="secondary"
            size="xl"
            fullWidth
            onClick={() => team1 && handleSelectWinner(team1.id)}
          >
            <TeamLabel name={team1?.name ?? '?'} players={[team1?.player1_name, team1?.player2_name]} />
          </Button>

          <div className="text-center text-zinc-600 font-bold text-sm">VS</div>

          <Button
            variant="secondary"
            size="xl"
            fullWidth
            onClick={() => team2 && handleSelectWinner(team2.id)}
          >
            <TeamLabel name={team2?.name ?? '?'} players={[team2?.player1_name, team2?.player2_name]} />
          </Button>
        </div>
      )}

      {step === 'cups' && winnerTeam && (
        <div className="flex flex-col gap-6">
          {/* Vainqueur */}
          <div className="text-center">
            <p className="text-zinc-400 text-sm mb-1">Vainqueur</p>
            <p className="text-white text-2xl font-bold">{winnerTeam.name}</p>
          </div>

          {/* Nombre de gobelets */}
          <div>
            <p className="text-zinc-400 text-center text-sm mb-4">
              Combien de gobelets restaient au vainqueur ?
            </p>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setCups((c) => Math.max(1, c - 1))}
                className="w-16 h-16 rounded-full bg-zinc-700 text-white text-3xl font-bold
                           hover:bg-zinc-600 active:scale-95 transition-all select-none"
                aria-label="Moins"
              >
                −
              </button>

              <span className="text-5xl font-black text-brand w-16 text-center tabular-nums">
                {cups}
              </span>

              <button
                onClick={() => setCups((c) => Math.min(cupsPerSide, c + 1))}
                className="w-16 h-16 rounded-full bg-zinc-700 text-white text-3xl font-bold
                           hover:bg-zinc-600 active:scale-95 transition-all select-none"
                aria-label="Plus"
              >
                +
              </button>
            </div>
          </div>

          {/* ── Règles spéciales ── */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-zinc-800" />
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                Règles spéciales
              </p>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            <div className="flex flex-col gap-2">
              {/* GAME OVER — toggle */}
              <button
                onClick={() => updateEvent('game_over', !specialEvents.game_over)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left
                  ${specialEvents.game_over
                    ? 'bg-red-500/15 border-red-500/40 text-red-300'
                    : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
              >
                <span className="text-xl leading-none">💥</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">GAME OVER</p>
                  <p className="text-xs opacity-60">Les deux balles dans le même verre</p>
                </div>
                <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                  ${specialEvents.game_over
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'border-zinc-600'
                  }`}
                >
                  {specialEvents.game_over && <span className="text-xs font-bold">✓</span>}
                </span>
              </button>

              {/* BALLS BACK — compteur */}
              <SpecialEventCounter
                emoji="🔄"
                label="BALLS BACK"
                description="Les deux balles dans des verres différents"
                value={specialEvents.balls_back_count}
                onChange={(v) => updateEvent('balls_back_count', v)}
              />

              {/* REBOND — compteur */}
              <SpecialEventCounter
                emoji="🏓"
                label="REBOND"
                description="Rebond sur la table réussi"
                value={specialEvents.bounce_count}
                onChange={(v) => updateEvent('bounce_count', v)}
              />

              {/* TRICKSHOT — compteur */}
              <SpecialEventCounter
                emoji="🎪"
                label="TRICKSHOT"
                description="Lancer spécial réussi"
                value={specialEvents.trickshot_count}
                onChange={(v) => updateEvent('trickshot_count', v)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep('winner')}>
              Retour
            </Button>
            <Button size="lg" fullWidth loading={loading} onClick={handleConfirm}>
              Confirmer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Compteur pour une règle spéciale ─────────────────────────

function SpecialEventCounter({
  emoji,
  label,
  description,
  value,
  onChange,
}: {
  emoji: string
  label: string
  description: string
  value: number
  onChange: (v: number) => void
}) {
  const isActive = value > 0

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
        ${isActive
          ? 'bg-brand/10 border-brand/30 text-white'
          : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
        }`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${isActive ? 'text-white' : ''}`}>{label}</p>
        <p className="text-xs opacity-60 truncate">{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-sm
                     active:scale-95 transition-all select-none flex items-center justify-center"
          aria-label={`Moins ${label}`}
        >
          −
        </button>
        <span className={`w-6 text-center font-black text-base tabular-nums
          ${isActive ? 'text-brand' : 'text-zinc-500'}`}
        >
          {value}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          className="w-7 h-7 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-sm
                     active:scale-95 transition-all select-none flex items-center justify-center"
          aria-label={`Plus ${label}`}
        >
          +
        </button>
      </div>
    </div>
  )
}

// ── Label d'équipe ────────────────────────────────────────────

function TeamLabel({ name, players }: { name: string; players: (string | undefined)[] }) {
  return (
    <span className="flex flex-col items-center gap-0.5">
      <span className="text-xl font-bold">{name}</span>
      <span className="text-xs text-zinc-400 font-normal">
        {players.filter(Boolean).join(' & ')}
      </span>
    </span>
  )
}
