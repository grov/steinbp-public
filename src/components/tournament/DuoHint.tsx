import type { Duo } from '../../types/database'

/** Indique sous le nom d'équipe que ce duo a déjà joué ensemble. */
export function DuoHint({ duo, name }: { duo: Duo | null; name: string }) {
  if (!duo) return null
  const renamed = name.trim() !== '' && name.trim() !== duo.name
  return (
    <p className="text-xs text-zinc-400 -mt-1">
      🤝 Duo déjà connu : <span className="font-semibold text-white">{duo.name}</span>
      {renamed && <span className="text-zinc-500"> — il prendra ce nouveau nom</span>}
    </p>
  )
}
