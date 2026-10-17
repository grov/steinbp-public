import { useEffect, useState } from 'react'

/** Temps restant d'un match chronométré (mm:ss), rouge une fois écoulé. */
export function MatchTimer({
  startedAt,
  durationMinutes,
  className = '',
}: {
  startedAt: string
  durationMinutes: number
  className?: string
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const endsAt = new Date(startedAt).getTime() + durationMinutes * 60_000
  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000))

  if (remaining === 0) {
    return <span className={`font-semibold text-red-400 ${className}`}>⏱ Temps écoulé</span>
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = String(remaining % 60).padStart(2, '0')
  const urgent = remaining <= 60

  return (
    <span className={`font-semibold tabular-nums ${urgent ? 'text-orange-400' : 'text-zinc-300'} ${className}`}>
      ⏱ {minutes}:{seconds}
    </span>
  )
}

/** Vrai si le match se joue au chrono (qualifications d'un tournoi officiel). */
export function isTimedMatch(
  match: { phase: string; status: string; started_at: string | null },
  tournament: { format: string; match_duration: number | null },
): boolean {
  return (
    tournament.format === 'official' &&
    !!tournament.match_duration &&
    match.phase === 'group' &&
    match.status === 'in_progress' &&
    !!match.started_at
  )
}
