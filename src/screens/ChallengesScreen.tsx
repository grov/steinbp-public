import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import {
  fetchPlayerChallenges,
  computeHeadToHead,
  challengeWinnerIsPlayer,
  deleteChallenge,
  type HeadToHead,
} from '../lib/challengeActions'
import { TRICK_DEFS } from '../lib/tricks'
import type { Challenge } from '../types/database'

export function ChallengesScreen() {
  const { player } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!player) return
    setLoading(true)
    try {
      setChallenges(await fetchPlayerChallenges(player.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id])

  if (!player) return null

  const h2h = computeHeadToHead(challenges, player.id)
  const totalWins = challenges.filter((c) => challengeWinnerIsPlayer(c, player.id)).length
  const totalLosses = challenges.length - totalWins

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce défi ?')) return
    await deleteChallenge(id)
    setChallenges((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-brand flex items-center gap-2">⚔️ Défis</h1>
          <Link
            to="/profile"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            Mon profil
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col gap-6">
        <Link to="/challenges/new">
          <Button size="lg" fullWidth>+ Nouveau défi</Button>
        </Link>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-4xl mb-2">⚔️</p>
            <p>Aucun défi pour l'instant.</p>
            <p className="text-sm mt-1">Lance ton premier défi contre un ami&nbsp;!</p>
          </div>
        ) : (
          <>
            {/* Bilan global */}
            <section className="grid grid-cols-3 gap-3">
              <ScoreBox label="Défis" value={challenges.length} />
              <ScoreBox label="Victoires" value={totalWins} tone="win" />
              <ScoreBox label="Défaites" value={totalLosses} tone="loss" />
            </section>

            {/* Classement tête-à-tête */}
            <section className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Tête-à-tête</p>
              <div className="flex flex-col gap-2">
                {h2h.map((r) => (
                  <HeadToHeadRow key={r.opponentId ?? r.opponentName} row={r} />
                ))}
              </div>
            </section>

            {/* Historique */}
            <section className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Historique</p>
              <div className="flex flex-col gap-2">
                {challenges.map((c) => (
                  <ChallengeRow
                    key={c.id}
                    challenge={c}
                    playerId={player.id}
                    canDelete={c.created_by === player.id}
                    onDelete={() => handleDelete(c.id)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function ScoreBox({ label, value, tone }: { label: string; value: number; tone?: 'win' | 'loss' }) {
  const color = tone === 'win' ? 'text-green-400' : tone === 'loss' ? 'text-red-400' : 'text-white'
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-center">
      <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-0.5">{label}</p>
    </div>
  )
}

function HeadToHeadRow({ row }: { row: HeadToHead }) {
  const positive = row.wins > row.losses
  const inner = (
    <div className="flex items-center justify-between gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
      <span className="font-semibold text-white text-sm truncate">{row.opponentName}</span>
      <span className="text-sm font-black tabular-nums shrink-0">
        <span className={positive ? 'text-green-400' : 'text-zinc-400'}>{row.wins}</span>
        <span className="text-zinc-600"> · </span>
        <span className={row.losses > row.wins ? 'text-red-400' : 'text-zinc-400'}>{row.losses}</span>
      </span>
    </div>
  )
  return row.opponentId ? <Link to={`/player/${row.opponentId}`}>{inner}</Link> : inner
}

function ChallengeRow({
  challenge, playerId, canDelete, onDelete,
}: { challenge: Challenge; playerId: string; canDelete: boolean; onDelete: () => void }) {
  const iWon = challengeWinnerIsPlayer(challenge, playerId)
  const isP1 = challenge.player1_id === playerId
  const myName = isP1 ? challenge.player1_name : challenge.player2_name
  const oppName = isP1 ? challenge.player2_name : challenge.player1_name

  // Résumé des tricks (tous joueurs confondus)
  const trickSummary = TRICK_DEFS.map((def) => ({
    def,
    count: challenge.trick_events
      .filter((e) => e.type === def.type)
      .reduce((s, e) => s + e.count, 0),
  })).filter((t) => t.count > 0)

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${iWon ? 'bg-green-500/5 border-green-500/20' : 'bg-zinc-900 border-zinc-800'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">
            <span className={iWon ? 'text-green-400' : ''}>{myName}</span>
            <span className="text-zinc-600 mx-1.5">vs</span>
            {oppName}
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            {iWon ? '🏆 Victoire' : 'Défaite'} · {new Date(challenge.created).toLocaleDateString('fr-FR')}
          </p>
        </div>
        {canDelete && (
          <button
            onClick={onDelete}
            className="text-zinc-600 hover:text-red-400 transition-colors text-xs shrink-0 p-1"
            aria-label="Supprimer le défi"
          >
            🗑
          </button>
        )}
      </div>

      {trickSummary.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {trickSummary.map(({ def, count }) => (
            <span
              key={def.type}
              className="inline-flex items-center gap-1 text-[11px] bg-zinc-800/70 rounded-full px-2 py-0.5 text-zinc-400"
              title={def.label}
            >
              {def.emoji} {count}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
