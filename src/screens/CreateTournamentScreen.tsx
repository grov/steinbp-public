import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pocketbase'
import { createTournament } from '../lib/tournamentActions'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { CreateTournamentPayload, TournamentFormat } from '../types/database'

export function CreateTournamentScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CreateTournamentPayload>({
    name: '',
    format: 'single_elimination',
    num_tables: 2,
    cups_per_side: 10,
    groups_count: 4,
    teams_advance_per_group: 2,
  })

  function set<K extends keyof CreateTournamentPayload>(key: K, value: CreateTournamentPayload[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Le nom du tournoi est requis.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const userId = pb.authStore.model?.id
      if (!userId) throw new Error('Vous devez être connecté pour créer un tournoi.')

      const tournament = await createTournament(form, userId)
      navigate(`/tournament/${tournament.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="text-zinc-400 hover:text-white p-2 -ml-2 rounded-xl transition-colors"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">Nouveau tournoi</h1>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Nom */}
        <Input
          label="Nom du tournoi"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Ex : Beer Pong Night #3"
          maxLength={60}
          autoFocus
        />

        {/* Format */}
        <div>
          <p className="text-sm font-medium text-zinc-300 mb-2">Format</p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                {
                  value: 'single_elimination',
                  label: 'Élimination directe',
                  desc: 'Bracket KO classique',
                  icon: '🎯',
                },
                {
                  value: 'group_then_elimination',
                  label: 'Poules + Arbre',
                  desc: 'Phase de groupes puis KO',
                  icon: '🏆',
                },
              ] as { value: TournamentFormat; label: string; desc: string; icon: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                onClick={() => set('format', opt.value)}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-98
                  ${
                    form.format === opt.value
                      ? 'border-brand bg-brand/10'
                      : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500'
                  }`}
              >
                <p className="text-2xl mb-1">{opt.icon}</p>
                <p className="font-bold text-sm text-white">{opt.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Options poules */}
        {form.format === 'group_then_elimination' && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-4">
            <p className="text-sm font-bold text-zinc-300">Configuration des poules</p>
            <NumberStepper
              label="Nombre de groupes"
              value={form.groups_count ?? 4}
              min={2}
              max={8}
              onChange={(v) => set('groups_count', v)}
            />
            <NumberStepper
              label="Équipes qualifiées par groupe"
              value={form.teams_advance_per_group ?? 2}
              min={1}
              max={4}
              onChange={(v) => set('teams_advance_per_group', v)}
            />
          </div>
        )}

        {/* Tables et gobelets */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-sm font-bold text-zinc-300">Configuration des matchs</p>
          <NumberStepper
            label="Nombre de tables"
            value={form.num_tables}
            min={1}
            max={10}
            onChange={(v) => set('num_tables', v)}
          />
          <NumberStepper
            label="Gobelets par équipe"
            value={form.cups_per_side}
            min={1}
            max={15}
            onChange={(v) => set('cups_per_side', v)}
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <Button size="xl" fullWidth loading={loading} onClick={handleSubmit}>
          Créer le tournoi →
        </Button>
      </div>
    </div>
  )
}

// ── Composant stepper réutilisable ────────────────────────────

function NumberStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-300 text-sm flex-1">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-10 h-10 rounded-full bg-zinc-700 text-white font-bold text-xl
                     hover:bg-zinc-600 active:scale-95 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed select-none"
        >
          −
        </button>
        <span className="text-white font-bold text-xl w-8 text-center tabular-nums">{value}</span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-10 h-10 rounded-full bg-zinc-700 text-white font-bold text-xl
                     hover:bg-zinc-600 active:scale-95 transition-all
                     disabled:opacity-30 disabled:cursor-not-allowed select-none"
        >
          +
        </button>
      </div>
    </div>
  )
}
