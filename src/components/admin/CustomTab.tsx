import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import {
  fetchAppSettings,
  saveAppSettings,
  DEFAULT_SETTINGS,
  computeXp,
} from '../../lib/settingsActions'
import type { AppSettings, BadgeConfig, BadgeStat, RankTierConfig } from '../../types/settings'

// ── Options de stats disponibles pour les badges ──────────────

const STAT_OPTIONS: { value: BadgeStat; label: string }[] = [
  { value: 'matches_played',     label: 'Matchs joués'    },
  { value: 'matches_won',        label: 'Matchs gagnés'   },
  { value: 'win_rate',           label: 'Win rate (%)'    },
  { value: 'tournaments_played', label: 'Tournois joués'  },
  { value: 'tournaments_won',    label: 'Tournois gagnés' },
  { value: 'balls_back_count',   label: 'Balls Back'      },
  { value: 'bounce_count',       label: 'Rebonds'         },
  { value: 'trickshot_count',    label: 'Trickshots'      },
  { value: 'game_over_count',    label: 'Game Over'       },
]

// ── Composant principal ───────────────────────────────────────

export function CustomTab() {
  const [loading, setLoading]   = useState(true)
  const [saving,  setSaving]    = useState(false)
  const [saved,   setSaved]     = useState(false)
  const [draft,   setDraft]     = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    fetchAppSettings().then(s => { setDraft(s); setLoading(false) })
  }, [])

  // ── Rangs ──────────────────────────────────────────────────

  function updateTier(idx: number, field: keyof RankTierConfig, value: string | number) {
    setDraft(prev => {
      const tiers = [...prev.rank_tiers]
      tiers[idx] = { ...tiers[idx], [field]: value }
      return { ...prev, rank_tiers: tiers }
    })
    setSaved(false)
  }

  function deleteTier(idx: number) {
    setDraft(prev => ({
      ...prev,
      rank_tiers: prev.rank_tiers.filter((_, i) => i !== idx),
    }))
    setSaved(false)
  }

  function addTier() {
    const maxMin = Math.max(0, ...draft.rank_tiers.map(t => t.min))
    setDraft(prev => ({
      ...prev,
      rank_tiers: [...prev.rank_tiers, { name: 'Nouveau rang', emoji: '⭐', min: maxMin + 10 }],
    }))
    setSaved(false)
  }

  // ── Badges ─────────────────────────────────────────────────

  function updateBadge(idx: number, field: keyof BadgeConfig, value: string | number) {
    setDraft(prev => {
      const badges = [...prev.badges]
      badges[idx] = { ...badges[idx], [field]: value }
      return { ...prev, badges }
    })
    setSaved(false)
  }

  function deleteBadge(idx: number) {
    setDraft(prev => ({
      ...prev,
      badges: prev.badges.filter((_, i) => i !== idx),
    }))
    setSaved(false)
  }

  function addBadge() {
    const newBadge: BadgeConfig = {
      id:        `badge_${Date.now()}`,
      emoji:     '⭐',
      name:      'Nouveau badge',
      desc:      'Description',
      stat:      'matches_played',
      threshold: 1,
    }
    setDraft(prev => ({ ...prev, badges: [...prev.badges, newBadge] }))
    setSaved(false)
  }

  // ── Poids XP ───────────────────────────────────────────────

  function updateWeight(key: keyof typeof draft.xp_weights, value: number) {
    setDraft(prev => ({ ...prev, xp_weights: { ...prev.xp_weights, [key]: value } }))
    setSaved(false)
  }

  // ── Sauvegarde / Reset ─────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try {
      await saveAppSettings(draft)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (!confirm('Réinitialiser les rangs et badges par défaut ?')) return
    setDraft(structuredClone(DEFAULT_SETTINGS))
    setSaved(false)
  }

  // ── Aperçu XP ─────────────────────────────────────────────

  const { matches_played: wp, matches_won: ww, tournaments_won: wt } = draft.xp_weights
  const xpFormula = [
    wp > 0 && `Matchs joués × ${wp}`,
    ww > 0 && `Matchs gagnés × ${ww}`,
    wt > 0 && `Tournois gagnés × ${wt}`,
  ].filter(Boolean).join(' + ') || '0'

  const sortedTiers = [...draft.rank_tiers].sort((a, b) => a.min - b.min)

  if (loading) {
    return <div className="text-zinc-600 text-sm py-8 text-center">Chargement…</div>
  }

  return (
    <div className="flex flex-col gap-8 pb-10">

      {/* ── Formule XP ─────────────────────────────────────── */}
      <section>
        <SectionTitle>Formule XP</SectionTitle>
        <p className="text-zinc-500 text-xs mb-4">
          Comment est calculé le score de progression d'un joueur.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <WeightInput
              label="Matchs joués"
              value={wp}
              onChange={v => updateWeight('matches_played', v)}
            />
            <WeightInput
              label="Matchs gagnés"
              value={ww}
              onChange={v => updateWeight('matches_won', v)}
            />
            <WeightInput
              label="Tournois gagnés"
              value={wt}
              onChange={v => updateWeight('tournaments_won', v)}
            />
          </div>

          <div className="bg-zinc-800/60 rounded-lg px-3 py-2 text-xs">
            <span className="text-zinc-500">Formule : </span>
            <span className="text-brand font-mono font-semibold">XP = {xpFormula}</span>
          </div>

          {/* Aperçu des rangs avec la formule */}
          {sortedTiers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-800">
              {sortedTiers.map(tier => {
                const exampleStats = { matches_played: tier.min, matches_won: 0, win_rate: 0, tournaments_played: 0, tournaments_won: 0, balls_back_count: 0, bounce_count: 0, trickshot_count: 0, game_over_count: 0 }
                const xp = computeXp(exampleStats, draft.xp_weights)
                return (
                  <span key={tier.name} className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-400">
                    {tier.emoji} {tier.name} ≥ {xp} XP
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Rangs ──────────────────────────────────────────── */}
      <section>
        <SectionTitle>Rangs ({draft.rank_tiers.length})</SectionTitle>
        <p className="text-zinc-500 text-xs mb-4">
          Triés automatiquement par score minimum. Le premier rang (min = 0) est le rang de départ.
        </p>

        <div className="flex flex-col gap-2 mb-3">
          {sortedTiers.map((tier, sortedIdx) => {
            // Retrouve l'index réel dans draft.rank_tiers
            const realIdx = draft.rank_tiers.findIndex(
              t => t.name === tier.name && t.emoji === tier.emoji && t.min === tier.min,
            )
            return (
              <RankRow
                key={`${tier.emoji}-${tier.name}-${tier.min}`}
                tier={tier}
                isFirst={sortedIdx === 0}
                onChange={(field, value) => updateTier(realIdx, field, value)}
                onDelete={() => deleteTier(realIdx)}
              />
            )
          })}
        </div>

        <button
          onClick={addTier}
          className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-zinc-600 text-sm hover:border-brand/40 hover:text-brand/70 transition-colors"
        >
          + Ajouter un rang
        </button>
      </section>

      {/* ── Badges ─────────────────────────────────────────── */}
      <section>
        <SectionTitle>Badges ({draft.badges.length})</SectionTitle>
        <p className="text-zinc-500 text-xs mb-4">
          Débloqués quand la statistique choisie atteint le seuil défini.
        </p>

        <div className="flex flex-col gap-2 mb-3">
          {draft.badges.map((badge, idx) => (
            <BadgeRow
              key={badge.id}
              badge={badge}
              onChange={(field, value) => updateBadge(idx, field, value)}
              onDelete={() => deleteBadge(idx)}
            />
          ))}
        </div>

        <button
          onClick={addBadge}
          className="w-full py-2 border border-dashed border-zinc-700 rounded-xl text-zinc-600 text-sm hover:border-brand/40 hover:text-brand/70 transition-colors"
        >
          + Ajouter un badge
        </button>
      </section>

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex gap-3 items-center sticky bottom-4">
        <button
          onClick={handleReset}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
        >
          Réinitialiser
        </button>
        <Button fullWidth size="lg" loading={saving} onClick={handleSave}>
          {saved ? '✓ Sauvegardé !' : 'Sauvegarder les modifications'}
        </Button>
      </div>
    </div>
  )
}

// ── SectionTitle ──────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
      {children}
    </h2>
  )
}

// ── WeightInput ───────────────────────────────────────────────

function WeightInput({
  label, value, onChange,
}: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</label>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={e => onChange(Math.max(0, Number(e.target.value)))}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-sm text-white text-center
                   focus:outline-none focus:border-brand tabular-nums w-full"
      />
    </div>
  )
}

// ── RankRow ───────────────────────────────────────────────────

function RankRow({
  tier, isFirst, onChange, onDelete,
}: {
  tier: RankTierConfig
  isFirst: boolean
  onChange: (field: keyof RankTierConfig, value: string | number) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-2">
      {/* Emoji */}
      <input
        type="text"
        value={tier.emoji}
        onChange={e => onChange('emoji', e.target.value)}
        maxLength={2}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-1.5 text-base text-center w-11
                   focus:outline-none focus:border-brand shrink-0"
      />
      {/* Nom */}
      <input
        type="text"
        value={tier.name}
        onChange={e => onChange('name', e.target.value)}
        placeholder="Nom du rang"
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white
                   focus:outline-none focus:border-brand flex-1 min-w-0"
      />
      {/* Score minimum */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-zinc-600 text-xs">≥</span>
        <input
          type="number"
          min="0"
          value={tier.min}
          onChange={e => onChange('min', Math.max(0, Number(e.target.value)))}
          disabled={isFirst}
          title={isFirst ? 'Le premier rang commence toujours à 0' : undefined}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white
                     text-center w-16 focus:outline-none focus:border-brand tabular-nums
                     disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <span className="text-zinc-600 text-xs">XP</span>
      </div>
      {/* Supprimer */}
      <button
        onClick={onDelete}
        disabled={isFirst}
        title={isFirst ? 'Impossible de supprimer le rang de départ' : 'Supprimer ce rang'}
        className="text-zinc-700 hover:text-red-400 transition-colors text-lg leading-none shrink-0
                   disabled:opacity-20 disabled:cursor-not-allowed"
      >
        ✕
      </button>
    </div>
  )
}

// ── BadgeRow ──────────────────────────────────────────────────

function BadgeRow({
  badge, onChange, onDelete,
}: {
  badge: BadgeConfig
  onChange: (field: keyof BadgeConfig, value: string | number) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col gap-2">
      {/* Ligne 1 : emoji + nom + desc */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={badge.emoji}
          onChange={e => onChange('emoji', e.target.value)}
          maxLength={2}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-1 py-1.5 text-base text-center w-11
                     focus:outline-none focus:border-brand shrink-0"
        />
        <input
          type="text"
          value={badge.name}
          onChange={e => onChange('name', e.target.value)}
          placeholder="Nom du badge"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white
                     focus:outline-none focus:border-brand w-28 shrink-0"
        />
        <input
          type="text"
          value={badge.desc}
          onChange={e => onChange('desc', e.target.value)}
          placeholder="Description"
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-zinc-400
                     focus:outline-none focus:border-brand flex-1 min-w-0"
        />
        <button
          onClick={onDelete}
          className="text-zinc-700 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Ligne 2 : stat + seuil */}
      <div className="flex items-center gap-2 pl-1">
        <span className="text-zinc-600 text-xs shrink-0">Déverrouillé si</span>
        <select
          value={badge.stat}
          onChange={e => onChange('stat', e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-300
                     focus:outline-none focus:border-brand flex-1 min-w-0"
        >
          {STAT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-zinc-600 text-xs shrink-0">≥</span>
        <input
          type="number"
          min="1"
          value={badge.threshold}
          onChange={e => onChange('threshold', Math.max(1, Number(e.target.value)))}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-sm text-white
                     text-center w-16 focus:outline-none focus:border-brand tabular-nums shrink-0"
        />
      </div>
    </div>
  )
}
