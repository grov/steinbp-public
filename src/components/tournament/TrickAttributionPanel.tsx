import type { TrickEvent, TrickType } from '../../types/database'
import { TRICK_DEFS } from '../../lib/tricks'

// Un emplacement de joueur auquel on peut attribuer des tricks.
export interface TrickSlot {
  key: string
  player_id: string | null
  name: string
  subtitle?: string
}

interface TrickAttributionPanelProps {
  slots: TrickSlot[]
  events: TrickEvent[]
  onChange: (events: TrickEvent[]) => void
}

/** Vrai si l'événement appartient à cet emplacement de joueur. */
function matchesSlot(event: TrickEvent, slot: TrickSlot): boolean {
  if (slot.player_id) return event.player_id === slot.player_id
  return event.player_id === null && event.player_name === slot.name
}

export function TrickAttributionPanel({ slots, events, onChange }: TrickAttributionPanelProps) {
  function getCount(slot: TrickSlot, type: TrickType): number {
    return events.find((e) => matchesSlot(e, slot) && e.type === type)?.count ?? 0
  }

  function setCount(slot: TrickSlot, type: TrickType, value: number) {
    const next = events.filter((e) => !(matchesSlot(e, slot) && e.type === type))
    if (value > 0) {
      next.push({ player_id: slot.player_id, player_name: slot.name, type, count: value })
    }
    onChange(next)
  }

  if (slots.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {slots.map((slot) => (
        <div key={slot.key} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="flex items-baseline gap-2 mb-2.5">
            <p className="font-bold text-white text-sm truncate">{slot.name}</p>
            {slot.subtitle && (
              <p className="text-[10px] uppercase tracking-wider text-zinc-600 truncate">{slot.subtitle}</p>
            )}
            {!slot.player_id && (
              <span className="text-[9px] uppercase tracking-wider text-zinc-600 shrink-0" title="Joueur non lié à un compte">
                invité
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {TRICK_DEFS.map((def) => {
              const value = getCount(slot, def.type)
              const active = value > 0
              return (
                <div
                  key={def.type}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-colors
                    ${active
                      ? def.isBlunder
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-brand/10 border-brand/30'
                      : 'bg-zinc-800/50 border-zinc-700/60'
                    }`}
                  title={def.description}
                >
                  <span className="text-base leading-none">{def.emoji}</span>
                  <span className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 truncate">
                    {def.label}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setCount(slot, def.type, Math.max(0, value - 1))}
                      className="w-5 h-5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold
                                 active:scale-95 transition-all flex items-center justify-center select-none"
                      aria-label={`Moins ${def.label} ${slot.name}`}
                    >
                      −
                    </button>
                    <span className={`w-4 text-center text-sm font-black tabular-nums
                      ${active ? (def.isBlunder ? 'text-red-400' : 'text-brand') : 'text-zinc-600'}`}
                    >
                      {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCount(slot, def.type, value + 1)}
                      className="w-5 h-5 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold
                                 active:scale-95 transition-all flex items-center justify-center select-none"
                      aria-label={`Plus ${def.label} ${slot.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Construit les emplacements de joueurs à partir des deux équipes d'un match. */
export function slotsFromTeams(
  team1: { id: string; name: string; player1_name: string; player2_name: string; player1_id: string | null; player2_id: string | null } | null,
  team2: { id: string; name: string; player1_name: string; player2_name: string; player1_id: string | null; player2_id: string | null } | null,
): TrickSlot[] {
  const slots: TrickSlot[] = []
  for (const team of [team1, team2]) {
    if (!team) continue
    const players: [string, string | null][] = [
      [team.player1_name, team.player1_id],
      [team.player2_name, team.player2_id],
    ]
    players.forEach(([name, id], i) => {
      if (!name || !name.trim()) return
      slots.push({
        key: id ?? `${team.id}-p${i + 1}`,
        player_id: id,
        name,
        subtitle: team.name,
      })
    })
  }
  return slots
}
