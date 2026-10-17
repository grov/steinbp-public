import type { ReactNode } from 'react'

// Briques visuelles partagées par les fiches joueur et équipe.

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-px bg-zinc-800" />
      <p className="text-[10px] font-bold uppercase tracking-[4px] text-zinc-600">{children}</p>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

export function RpgStatBox({
  icon, label, value, highlight = false,
}: { icon: string; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border relative overflow-hidden
      ${highlight ? 'bg-brand/10 border-brand/25' : 'bg-zinc-900 border-zinc-800'}`}
    >
      {highlight && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand/40 to-transparent" />
      )}
      <span className="text-xl block mb-1">{icon}</span>
      <p className={`text-3xl font-black ${highlight ? 'text-brand' : 'text-white'}`}>{value}</p>
      <p className="text-zinc-500 text-xs mt-1">{label}</p>
    </div>
  )
}
