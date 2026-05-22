import type { ReactNode } from 'react'
import type { MatchStatus, TournamentStatus } from '../../types/database'

type BadgeVariant = 'orange' | 'green' | 'blue' | 'red' | 'zinc' | 'yellow'

const variantClasses: Record<BadgeVariant, string> = {
  orange: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  green: 'bg-green-500/20 text-green-300 border border-green-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  red: 'bg-red-500/20 text-red-300 border border-red-500/30',
  zinc: 'bg-zinc-700/60 text-zinc-400 border border-zinc-600/30',
  yellow: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export function Badge({ variant = 'zinc', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

// ── Helpers contextuels ───────────────────────────────────────

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const config: Record<MatchStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'En attente', variant: 'zinc' },
    ready: { label: 'Prêt', variant: 'yellow' },
    in_progress: { label: 'En cours', variant: 'green' },
    finished: { label: 'Terminé', variant: 'zinc' },
    bye: { label: 'Bye', variant: 'blue' },
  }
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function TournamentStatusBadge({ status }: { status: TournamentStatus }) {
  const config: Record<TournamentStatus, { label: string; variant: BadgeVariant }> = {
    registration: { label: 'Inscriptions', variant: 'blue' },
    group_phase: { label: 'Phase de poules', variant: 'yellow' },
    bracket_phase: { label: 'Arbre final', variant: 'orange' },
    finished: { label: 'Terminé', variant: 'green' },
  }
  const { label, variant } = config[status]
  return <Badge variant={variant}>{label}</Badge>
}
