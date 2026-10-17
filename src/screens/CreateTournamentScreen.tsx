import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb } from '../lib/pocketbase'
import { createTournament } from '../lib/tournamentActions'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { CreateTournamentPayload, TournamentFormat } from '../types/database'
import { DEFAULT_MATCH_DURATION, OFFICIAL_SCORING } from '../lib/standings'

const OFFICIAL_FIELDS = [
  'match_duration',
  'points_win',
  'points_win_time',
  'points_draw',
  'points_loss',
  'qualified_count',
] as const

const FORMATS: { value: TournamentFormat; label: string; desc: string; icon: string; wide?: boolean }[] = [
  {
    value: 'official',
    label: 'Tournoi officiel',
    desc: 'Qualifs chronométrées en chacun-contre-chacun, puis arbre final',
    icon: '⏱️',
    wide: true,
  },
  { value: 'single_elimination', label: 'Élimination directe', desc: 'Bracket KO classique', icon: '🎯' },
  { value: 'group_then_elimination', label: 'Poules + Arbre', desc: 'Phase de groupes puis KO', icon: '🏆' },
]

export function CreateTournamentScreen() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<CreateTournamentPayload>({
    name: '',
    format: 'single_elimination',
    num_tables: 1,
    cups_per_side: 10,
    cups_to_win: 10,
    groups_count: 4,
    teams_advance_per_group: 2,
    location: '',
    rules: '',
    match_duration: DEFAULT_MATCH_DURATION,
    points_win: OFFICIAL_SCORING.win,
    points_win_time: OFFICIAL_SCORING.win_time,
    points_draw: OFFICIAL_SCORING.draw,
    points_loss: OFFICIAL_SCORING.loss,
    qualified_count: 0, // 0 = automatique, calculé au lancement des qualifs
  })
  // Valeur brute du champ datetime-local (heure locale), convertie à l'envoi.
  const [startsAt, setStartsAt] = useState('')

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

      const payload: CreateTournamentPayload = {
        ...form,
        location: form.location?.trim(),
        rules: form.rules?.trim(),
        starts_at: startsAt ? new Date(startsAt).toISOString() : undefined,
      }
      if (form.format !== 'official') {
        for (const field of OFFICIAL_FIELDS) delete payload[field]
      }

      const tournament = await createTournament(payload, userId)
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
            {FORMATS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => set('format', opt.value)}
                className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-98
                  ${opt.wide ? 'col-span-2' : ''}
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

        {/* Options tournoi officiel */}
        {form.format === 'official' && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-4">
            <p className="text-sm font-bold text-zinc-300">Qualifications</p>
            <NumberStepper
              label="Durée d'un match (min)"
              value={form.match_duration ?? DEFAULT_MATCH_DURATION}
              min={1}
              max={60}
              onChange={(v) => set('match_duration', v)}
            />
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!form.qualified_count}
                  onChange={(e) => set('qualified_count', e.target.checked ? 0 : 8)}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-900 text-brand accent-brand"
                />
                <span className="text-sm text-zinc-300">Qualifiés pour l'arbre : automatique</span>
              </label>
              {form.qualified_count ? (
                <NumberStepper
                  label="Équipes qualifiées pour l'arbre"
                  value={form.qualified_count}
                  min={2}
                  max={64}
                  onChange={(v) => set('qualified_count', v)}
                />
              ) : (
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Calculé au lancement selon les équipes inscrites : 4 qualifiées jusqu'à 8 équipes,
                  8 jusqu'à 16, 16 jusqu'à 32…
                </p>
              )}
            </div>

            <p className="text-sm font-bold text-zinc-300 pt-2">Barème de points</p>
            <NumberStepper label="Victoire" value={form.points_win ?? 0} min={0} max={10} onChange={(v) => set('points_win', v)} />
            <NumberStepper label="Victoire au temps" value={form.points_win_time ?? 0} min={0} max={10} onChange={(v) => set('points_win_time', v)} />
            <NumberStepper label="Égalité au temps" value={form.points_draw ?? 0} min={0} max={10} onChange={(v) => set('points_draw', v)} />
            <NumberStepper label="Défaite" value={form.points_loss ?? 0} min={0} max={10} onChange={(v) => set('points_loss', v)} />
            <p className="text-zinc-500 text-xs leading-relaxed">
              Chaque équipe affronte toutes les autres. À la fin du temps, l'équipe qui a mis le plus de
              gobelets gagne « au temps ». La phase finale se joue sans chrono ni match nul.
            </p>
          </div>
        )}

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
            label="Gobelets installés"
            value={form.cups_per_side}
            min={1}
            max={10}
            onChange={(v) => {
              setForm((current) => ({
                ...current,
                cups_per_side: v,
                cups_to_win: Math.min(current.cups_to_win, v),
              }))
            }}
          />
          <NumberStepper
            label="Gobelets à mettre pour gagner"
            value={form.cups_to_win}
            min={1}
            max={form.cups_per_side}
            onChange={(v) => set('cups_to_win', v)}
          />
          <p className="text-zinc-500 text-xs leading-relaxed">
            La partie s'arrête dès que l'objectif est atteint. Par défaut, tous les gobelets doivent être mis.
          </p>
        </div>

        {/* Infos de l'événement */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 flex flex-col gap-4">
          <p className="text-sm font-bold text-zinc-300">Infos pour les joueurs (optionnel)</p>
          <Input
            label="Lieu"
            value={form.location ?? ''}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Ex : 4 rue Victor Gelez, Paris"
            maxLength={200}
          />
          <Input
            label="Date et heure"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="rules" className="text-sm font-medium text-zinc-300">
              Règles du jeu
            </label>
            <textarea
              id="rules"
              value={form.rules ?? ''}
              onChange={(e) => set('rules', e.target.value)}
              placeholder={form.format === 'official'
                ? 'Règles maison en plus du règlement officiel (affiché automatiquement)'
                : 'Ex : rebonds autorisés, re-rack à 6 et 3…'}
              maxLength={10000}
              rows={4}
              className="rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 px-4 py-3 text-base
                         focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
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
