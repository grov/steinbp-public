import type { ReactNode } from 'react'
import type { Tournament } from '../../types/database'

export function formatEventDate(iso: string | null): string | null {
  if (!iso) return null
  const date = new Date(iso)
  const day = date.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} à ${time}`
}

/** En-tête noir arrondi : retour, titre, puis date/lieu et actions. */
export function EventHeader({
  title,
  tournament,
  onBack,
  actions,
}: {
  title: string
  tournament?: Tournament
  onBack: () => void
  actions?: ReactNode
}) {
  const date = tournament ? formatEventDate(tournament.starts_at) : null
  const location = tournament?.location

  return (
    <header className="bg-black text-paper rounded-b-3xl px-4 pt-5 pb-5 shrink-0">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Retour"
            className="w-11 h-11 shrink-0 rounded-xl bg-paper text-black flex items-center justify-center text-2xl leading-none active:scale-95 transition-transform"
          >
            ‹
          </button>
          <h1 className="flex-1 min-w-0 text-xl font-semibold truncate">{title}</h1>
        </div>

        {(date || location || actions) && (
          <div className="flex items-end justify-between gap-3 mt-3">
            <div className="min-w-0 text-sm flex flex-col gap-1">
              {date && <p className="font-semibold">{date}</p>}
              {location && <p className="truncate">📍 {location}</p>}
            </div>
            {actions && <div className="flex flex-col items-end gap-2 shrink-0">{actions}</div>}
          </div>
        )}
      </div>
    </header>
  )
}

export function HeaderButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="bg-paper text-black rounded-full px-4 py-2 text-sm font-semibold active:scale-95 transition-transform whitespace-nowrap"
    >
      {children}
    </button>
  )
}
