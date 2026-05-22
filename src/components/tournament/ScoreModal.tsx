import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import type { MatchWithRelations } from '../../types/database'

interface ScoreModalProps {
  match: MatchWithRelations | null
  cupsPerSide: number
  onConfirm: (winnerId: string, cupsRemaining: number) => Promise<void>
  onClose: () => void
  editMode?: boolean
}

type Step = 'winner' | 'cups'

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
      await onConfirm(winnerId, cups)
      handleClose()
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setStep('winner')
    setWinnerId(null)
    setCups(1)
    onClose()
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
          <div className="text-center">
            <p className="text-zinc-400 text-sm mb-1">Vainqueur</p>
            <p className="text-white text-2xl font-bold">{winnerTeam.name}</p>
          </div>

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
