import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TrickAttributionPanel, slotsFromTeams } from './TrickAttributionPanel'
import type { MatchResult, MatchWithRelations, Tournament, TrickEvent } from '../../types/database'
import { minimumWinnerCupsRemaining } from '../../lib/cupScoring'
import { matchCups, resultFromCups, resultFromWinner, validateResult } from '../../lib/standings'

interface ScoreModalProps {
  match: MatchWithRelations | null
  tournament: Tournament
  onConfirm: (result: MatchResult, trickEvents: TrickEvent[]) => Promise<void>
  onClose: () => void
  editMode?: boolean
}

/**
 * Saisie du résultat. Tournoi officiel : score des deux équipes (victoire
 * au temps et égalité possibles en qualifications). Autres formats :
 * vainqueur puis gobelets qui lui restent.
 */
export function ScoreModal({ match, tournament, onConfirm, onClose, editMode = false }: ScoreModalProps) {
  if (!match) return null

  return tournament.format === 'official' ? (
    <OfficialScoreModal match={match} tournament={tournament} onConfirm={onConfirm} onClose={onClose} editMode={editMode} />
  ) : (
    <ClassicScoreModal match={match} tournament={tournament} onConfirm={onConfirm} onClose={onClose} editMode={editMode} />
  )
}

interface InnerProps extends Omit<ScoreModalProps, 'match'> {
  match: MatchWithRelations
}

// ── Tournoi officiel : score des deux équipes ─────────────────

function OfficialScoreModal({ match, tournament, onConfirm, onClose, editMode }: InnerProps) {
  const target = tournament.cups_to_win
  const initial = editMode ? matchCups(match, tournament) : null
  const [team1Cups, setTeam1Cups] = useState(initial?.team1 ?? 0)
  const [team2Cups, setTeam2Cups] = useState(initial?.team2 ?? 0)
  const [trickEvents, setTrickEvents] = useState<TrickEvent[]>(() =>
    editMode ? [...match.trick_events] : [],
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { team1, team2 } = match
  const result = resultFromCups(match, team1Cups, team2Cups)
  const validation = validateResult(result, match, match.phase, { ...tournament, allowTimeLimit: true })
  const summary = describeResult(result, match, tournament)

  async function handleConfirm() {
    if (validation) return
    setLoading(true)
    setError(null)
    try {
      await onConfirm(result, trickEvents)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={editMode ? 'Modifier le score' : 'Saisir le score'}>
      <div className="flex flex-col gap-6">
        <p className="text-zinc-400 text-center text-sm">
          Gobelets mis par chaque équipe · objectif {target}
          {match.phase === 'bracket' && ' · phase finale : un vainqueur obligatoire'}
        </p>

        <div className="flex flex-col gap-3">
          <CupStepper label={team1?.name ?? '?'} value={team1Cups} max={target} onChange={setTeam1Cups} />
          <CupStepper label={team2?.name ?? '?'} value={team2Cups} max={target} onChange={setTeam2Cups} />
        </div>

        <div
          className={`rounded-xl px-4 py-3 text-center text-sm font-medium ${
            validation ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-white'
          }`}
        >
          {validation ?? summary}
        </div>

        <ScoreTricks match={match} events={trickEvents} onChange={setTrickEvents} />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <div className="flex gap-3">
          <Button variant="ghost" size="lg" onClick={onClose}>Annuler</Button>
          <Button size="lg" fullWidth loading={loading} disabled={!!validation} onClick={handleConfirm}>
            Confirmer
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function describeResult(result: MatchResult, match: MatchWithRelations, tournament: Tournament): string {
  const { scoring, cups_to_win: target } = tournament
  const isGroup = match.phase === 'group'
  const pts = (n: number) => (isGroup ? ` · ${n} pt${n > 1 ? 's' : ''}` : '')

  if (!result.winnerId) return `Égalité au temps${pts(scoring.draw)} chacun`

  const winner = result.winnerId === match.team1_id ? match.team1 : match.team2
  const winnerCups = Math.max(result.team1Cups, result.team2Cups)
  return winnerCups >= target
    ? `Victoire de ${winner?.name ?? '?'}${pts(scoring.win)}`
    : `Victoire au temps de ${winner?.name ?? '?'}${pts(scoring.win_time)}`
}

export function CupStepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string
  value: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3">
      <span className="flex-1 font-semibold text-white truncate">{label}</span>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-11 h-11 rounded-full bg-zinc-800 text-white text-2xl hover:bg-zinc-700 active:scale-95 transition-all select-none"
        aria-label={`Retirer un gobelet à ${label}`}
      >
        −
      </button>
      <span className="text-3xl font-semibold w-10 text-center tabular-nums text-white">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-11 h-11 rounded-full bg-zinc-800 text-white text-2xl hover:bg-zinc-700 active:scale-95 transition-all select-none"
        aria-label={`Ajouter un gobelet à ${label}`}
      >
        +
      </button>
    </div>
  )
}

// ── Formats classiques : vainqueur + gobelets restants ────────

type Step = 'winner' | 'cups'

function ClassicScoreModal({ match, tournament, onConfirm, onClose, editMode }: InnerProps) {
  const { cups_per_side: cupsPerSide, cups_to_win: cupsToWin } = tournament
  const minimumCups = minimumWinnerCupsRemaining(cupsPerSide, cupsToWin)
  const [step, setStep] = useState<Step>(() => (editMode && match.winner_id ? 'cups' : 'winner'))
  const [winnerId, setWinnerId] = useState<string | null>(() => (editMode ? match.winner_id : null))
  const [cups, setCups] = useState<number>(() =>
    editMode && match.winner_cups_remaining != null ? match.winner_cups_remaining : minimumCups,
  )
  const [trickEvents, setTrickEvents] = useState<TrickEvent[]>(() =>
    editMode ? [...match.trick_events] : [],
  )
  const [loading, setLoading] = useState(false)

  const { team1, team2 } = match

  function handleSelectWinner(id: string) {
    setWinnerId(id)
    setCups(minimumCups)
    setStep('cups')
  }

  async function handleConfirm() {
    if (!winnerId) return
    setLoading(true)
    try {
      await onConfirm(resultFromWinner(match, winnerId, cups, tournament), trickEvents)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const winnerTeam = winnerId === team1?.id ? team1 : team2

  return (
    <Modal open onClose={onClose} title={editMode ? 'Modifier le score' : 'Saisir le score'}>
      {step === 'winner' && (
        <div className="flex flex-col gap-4">
          <p className="text-zinc-400 text-center">Qui a gagné ce match ?</p>

          <Button variant="secondary" size="xl" fullWidth onClick={() => team1 && handleSelectWinner(team1.id)}>
            <TeamLabel name={team1?.name ?? '?'} players={[team1?.player1_name, team1?.player2_name]} />
          </Button>

          <div className="text-center text-zinc-600 font-bold text-sm">VS</div>

          <Button variant="secondary" size="xl" fullWidth onClick={() => team2 && handleSelectWinner(team2.id)}>
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
            <p className="text-brand text-center text-xs font-semibold mb-2">
              Objectif du match : {cupsToWin} gobelet{cupsToWin > 1 ? 's' : ''} à mettre sur {cupsPerSide}
            </p>
            <p className="text-zinc-400 text-center text-sm mb-4">
              Combien de gobelets restaient au vainqueur ?
            </p>

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setCups((c) => Math.max(minimumCups, c - 1))}
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

          <ScoreTricks match={match} events={trickEvents} onChange={setTrickEvents} />

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

// ── Commun ────────────────────────────────────────────────────

function ScoreTricks({
  match,
  events,
  onChange,
}: {
  match: MatchWithRelations
  events: TrickEvent[]
  onChange: (events: TrickEvent[]) => void
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-zinc-800" />
        <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest">
          Qui a fait quoi ?
        </p>
        <div className="flex-1 h-px bg-zinc-800" />
      </div>

      <TrickAttributionPanel slots={slotsFromTeams(match.team1, match.team2)} events={events} onChange={onChange} />
    </div>
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
