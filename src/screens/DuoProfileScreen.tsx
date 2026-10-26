import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LEGENDARY_TOURNAMENTS,
  fetchDuoProfile,
  isLegendary,
  renameDuo,
  setDuoLegendary,
  type DuoPlayer,
  type DuoProfile,
} from '../lib/duos'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { RpgStatBox, SectionTitle } from '../components/ui/ProfileSection'

/** Fiche d'une équipe (duo permanent) : palmarès, bilan, rivaux, historique. */
export function DuoProfileScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { isAdmin, isManager } = useAuth()
  const [profile, setProfile] = useState<DuoProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    setProfile(await fetchDuoProfile(id))
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">Chargement…</div>
  }
  if (!profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600 text-center px-4">
        <div><p className="text-4xl mb-3">🔍</p><p>Équipe introuvable.</p></div>
      </div>
    )
  }

  const { duo, players, stats, tournaments, rivals } = profile
  const legendary = isLegendary(duo, stats.tournaments_played)
  const winRate = stats.matches_played > 0 ? Math.round((stats.matches_won / stats.matches_played) * 100) : 0
  const cupDiff = stats.cups_for - stats.cups_against

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-lg mx-auto px-4 pt-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
        >
          ← Retour
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">
        {/* ─── En-tête ─── */}
        <section
          className={`rounded-2xl border px-6 py-6 text-center flex flex-col items-center gap-4
            ${legendary ? 'bg-brand/10 border-brand/30' : 'bg-zinc-900 border-zinc-800'}`}
        >
          {legendary && (
            <span className="text-xs font-bold uppercase tracking-[3px] text-brand">🏛️ Équipe légendaire</span>
          )}
          <h1 className="text-3xl font-black leading-tight break-words">{duo.name}</h1>
          <div className="flex items-center justify-center gap-4">
            {players.map((p, i) => (
              <span key={p.id} className="contents">
                {i > 0 && <span className="text-zinc-600 text-sm">&</span>}
                <PlayerChip player={p} />
              </span>
            ))}
          </div>
          {!legendary && stats.tournaments_played > 0 && (
            <p className="text-xs text-zinc-500">
              {stats.tournaments_played} / {LEGENDARY_TOURNAMENTS} tournois ensemble avant le statut légendaire
            </p>
          )}
          {isManager && <ManagerActions profile={profile} isAdmin={isAdmin} onChanged={load} />}
        </section>

        {/* ─── Bilan ─── */}
        <section>
          <SectionTitle>Bilan</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <RpgStatBox icon="🎯" label="Tournois joués" value={stats.tournaments_played} />
            <RpgStatBox icon="👑" label="Tournois gagnés" value={stats.tournaments_won} highlight={stats.tournaments_won > 0} />
            <RpgStatBox icon="⚔️" label="Matchs joués" value={stats.matches_played} />
            <RpgStatBox icon="🏆" label="Matchs gagnés" value={stats.matches_won} highlight />
            <RpgStatBox icon="🤝" label="Matchs nuls" value={stats.matches_drawn} />
            <RpgStatBox icon="💔" label="Matchs perdus" value={stats.matches_lost} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className="text-2xl font-black text-green-400 tabular-nums">{winRate}%</p>
              <p className="text-zinc-500 text-xs mt-0.5">Victoires</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <p className={`text-2xl font-black tabular-nums ${cupDiff >= 0 ? 'text-white' : 'text-red-400'}`}>
                {cupDiff > 0 ? '+' : ''}{cupDiff}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">Gobelets ({stats.cups_for} mis, {stats.cups_against} pris)</p>
            </div>
          </div>
        </section>

        {/* ─── Rivaux ─── */}
        {rivals.length > 0 && (
          <section>
            <SectionTitle>Adversaires</SectionTitle>
            <div className="flex flex-col gap-2">
              {rivals.slice(0, 5).map((rival) => (
                <div key={rival.name} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="flex-1 min-w-0 truncate font-medium">{rival.name}</span>
                  <span className="text-xs text-zinc-500 tabular-nums">{rival.played} match{rival.played > 1 ? 's' : ''}</span>
                  <span className="text-sm font-bold tabular-nums">
                    <span className="text-green-400">{rival.won}</span>
                    <span className="text-zinc-600"> – </span>
                    <span className="text-red-400">{rival.played - rival.won}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Historique ─── */}
        {tournaments.length > 0 && (
          <section>
            <SectionTitle>Tournois ({tournaments.length})</SectionTitle>
            <div className="flex flex-col gap-2">
              {tournaments.map(({ tournament, teamName, won }) => (
                <Link
                  key={tournament.id}
                  to={`/my-tournaments/${tournament.id}`}
                  className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 transition-colors
                    ${won ? 'bg-brand/10 border-brand/25 hover:bg-brand/15' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800'}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">
                      {won && <span className="mr-1.5">🏆</span>}
                      {tournament.name}
                    </p>
                    {teamName !== duo.name && (
                      <p className="text-zinc-500 text-xs mt-0.5 truncate">sous le nom « {teamName} »</p>
                    )}
                  </div>
                  <span className="text-zinc-600 text-sm">›</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function PlayerChip({ player }: { player: DuoPlayer }) {
  return (
    <Link to={`/player/${player.id}`} className="flex flex-col items-center gap-1.5 group">
      <span className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center">
        {player.avatar_url ? (
          <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-zinc-400">{player.display_name[0]?.toUpperCase() ?? '?'}</span>
        )}
      </span>
      <span className="text-sm font-semibold text-zinc-300 group-hover:text-white group-hover:underline">{player.display_name}</span>
    </Link>
  )
}

/** Renommer (orga + admin) et statut légendaire (admin). */
function ManagerActions({ profile, isAdmin, onChanged }: { profile: DuoProfile; isAdmin: boolean; onChanged: () => void }) {
  const { duo } = profile
  // Au-delà du seuil, le statut est automatique : rien à basculer à la main.
  const canToggleLegendary = isAdmin && (duo.legendary || profile.stats.tournaments_played < LEGENDARY_TOURNAMENTS)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(duo.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setSaving(true)
    setError(null)
    try {
      await action()
      setEditing(false)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="w-full flex flex-col gap-2 text-left">
        <Input label="Nom de l'équipe" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
        <p className="text-xs text-zinc-500">Les tournois passés gardent le nom de l'époque.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setName(duo.name) }}>Annuler</Button>
          <Button size="sm" fullWidth loading={saving} disabled={!name.trim()} onClick={() => run(() => renameDuo(duo.id, name))}>
            Enregistrer
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
      <button onClick={() => setEditing(true)} className="text-zinc-400 hover:text-white underline underline-offset-2">
        ✏️ Renommer
      </button>
      {canToggleLegendary && (
        <button
          onClick={() => run(() => setDuoLegendary(duo.id, !duo.legendary))}
          disabled={saving}
          className="text-zinc-400 hover:text-white underline underline-offset-2"
        >
          {duo.legendary ? 'Retirer le statut légendaire' : '🏛️ Déclarer légendaire'}
        </button>
      )}
      {error && <p className="w-full text-red-400 text-sm">{error}</p>}
    </div>
  )
}
