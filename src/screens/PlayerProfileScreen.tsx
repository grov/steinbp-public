import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  fetchPublicPlayer,
  fetchPlayerStats,
  fetchPlayerTournaments,
  updateProfile,
  uploadAvatar,
  changePassword,
  type PlayerTournament,
} from '../lib/playerActions'
import { fetchAppSettings, computeXp, getRankInfo, DEFAULT_SETTINGS } from '../lib/settingsActions'
import { pb } from '../lib/pocketbase'
import { useAuth } from '../context/AuthContext'
import { useTheme, THEME_META } from '../context/ThemeContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { Player, PlayerStats, Team } from '../types/database'
import type { AppSettings } from '../types/settings'

// ── Écran principal ───────────────────────────────────────────

export function PlayerProfileScreen() {
  const { id } = useParams<{ id?: string }>()
  const { player: selfPlayer, refreshPlayer, isManager } = useAuth()
  const navigate = useNavigate()

  const targetId = id ?? selfPlayer?.id
  const isSelf = !id || id === selfPlayer?.id

  const [profile, setProfile] = useState<Player | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [, setTeams] = useState<Team[]>([])
  const [playerTournaments, setPlayerTournaments] = useState<PlayerTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selfPlayerRef = useRef(selfPlayer)
  selfPlayerRef.current = selfPlayer

  // Effect 1 : chargement identité
  useEffect(() => {
    if (!targetId) return
    if (isSelf) { setProfile(selfPlayerRef.current); setLoading(false); return }
    let active = true
    setLoading(true); setError(null)
    fetchPublicPlayer(targetId)
      .then(p => { if (!active) return; if (!p) setError('not found'); else setProfile(p) })
      .catch((e: unknown) => {
        if (!active) return
        if ((e as { isAbort?: boolean })?.isAbort) return
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [targetId, isSelf])

  // Effect 2 : stats + équipes + tournois
  useEffect(() => {
    if (!targetId) return
    let active = true
    Promise.all([
      fetchPlayerStats(targetId),
      fetchAppSettings(),
      pb.collection('teams').getFullList({
        filter: `player1_id = "${targetId}" || player2_id = "${targetId}"`,
        requestKey: `teams-${targetId}`,
      }).then(recs => recs.map(r => ({
        id: r.id,
        tournament_id: r['tournament_id'] as string,
        name: r['name'] as string,
        player1_name: r['player1_name'] as string,
        player2_name: r['player2_name'] as string,
        player1_id: (r['player1_id'] as string) || null,
        player2_id: (r['player2_id'] as string) || null,
        is_bye: r['is_bye'] as boolean,
        seed: (r['seed'] as number | null) || null,
        created: r.created,
      }))),
      fetchPlayerTournaments(targetId),
    ])
      .then(([s, appSettings, t, pt]) => {
        if (!active) return
        setStats(s as PlayerStats)
        setSettings(appSettings as AppSettings)
        setTeams(t as Team[])
        setPlayerTournaments(pt as PlayerTournament[])
      })
      .catch((e: unknown) => {
        if (!active) return
        if ((e as { isAbort?: boolean })?.isAbort) return
      })
    return () => { active = false }
  }, [targetId])

  if (loading) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">Chargement…</div>
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600 text-center px-4">
        <div><p className="text-4xl mb-3">🔍</p><p>Profil introuvable ou non approuvé.</p></div>
      </div>
    )
  }

  const showBack = isManager || !isSelf

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {showBack && (
        <div className="max-w-lg mx-auto px-4 pt-5">
          <button
            onClick={() => isManager && isSelf ? navigate('/admin') : navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
          >
            ← Retour
          </button>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-6">

        {/* ─── Hero Card ─── */}
        <HeroCard
          profile={profile}
          stats={stats}
          settings={settings}
          isSelf={isSelf}
          selfPlayerRef={selfPlayerRef}
          onUpdated={async () => {
            await refreshPlayer()
            if (isSelf) setProfile(selfPlayerRef.current)
            else if (targetId) setProfile(await fetchPublicPlayer(targetId))
          }}
        />

        {stats && (
          <>
            <StatsSection stats={stats} />
            <SpecialEventsSection stats={stats} />
            <BadgesSection stats={stats} settings={settings} />
            {playerTournaments.length > 0 && <TournamentsSection playerTournaments={playerTournaments} />}
            <div className="text-center text-zinc-800 text-xs tracking-[6px] select-none">· · · ✦ · · ·</div>
          </>
        )}
      </div>
    </div>
  )
}

// ── SectionTitle ──────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-px bg-zinc-800" />
      <p className="text-[10px] font-bold uppercase tracking-[4px] text-zinc-600">{children}</p>
      <div className="flex-1 h-px bg-zinc-800" />
    </div>
  )
}

// ── Hero Card ─────────────────────────────────────────────────

function HeroCard({
  profile, stats, settings, isSelf, selfPlayerRef, onUpdated,
}: {
  profile: Player
  stats: PlayerStats | null
  settings: AppSettings
  isSelf: boolean
  selfPlayerRef: MutableRefObject<Player | null>
  onUpdated: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [username, setUsername] = useState(profile.username)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const safeAvatarUrl = (() => {
    if (!avatarUrl) return null
    try {
      const { protocol } = new URL(avatarUrl)
      return protocol === 'http:' || protocol === 'https:' ? avatarUrl : null
    } catch { return null }
  })()
  const [changingPwd, setChangingPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { signOut, refreshPlayer } = useAuth()
  const { theme, cycleTheme } = useTheme()

  const rankInfo = stats
    ? getRankInfo(computeXp(stats, settings.xp_weights), settings.rank_tiers)
    : null

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile(profile.id, { display_name: displayName.trim(), username: username.trim() })
      setEditing(false)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.')
    } finally { setSaving(false) }
  }

  async function handleChangePwd() {
    if (!oldPwd || !newPwd || !confirmPwd) { setPwdError('Tous les champs sont requis.'); return }
    if (newPwd.length < 8) { setPwdError('8 caractères minimum.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas.'); return }
    setPwdSaving(true); setPwdError(null)
    try {
      await changePassword(profile.id, oldPwd, newPwd)
      setPwdSuccess(true); setOldPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Mot de passe actuel incorrect.')
    } finally { setPwdSaving(false) }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Image trop lourde (2 Mo max).'); return }
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(profile.id, file)
      setAvatarUrl(url + '?t=' + Date.now())
      if (selfPlayerRef.current) selfPlayerRef.current = { ...selfPlayerRef.current, avatar_url: url }
      await refreshPlayer()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur upload.')
    } finally { setUploadingAvatar(false) }
  }

  function togglePwd() {
    setOldPwd(''); setNewPwd(''); setConfirmPwd(''); setPwdError(null); setPwdSuccess(false)
    setChangingPwd(v => !v)
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">

      {/* ── Label Fiche de Héros ── */}
      <div className="text-center pt-5 pb-3 border-b border-zinc-800/60">
        <span className="text-[9px] font-bold uppercase tracking-[5px] text-zinc-600">
          ⚔ Fiche de Héros ⚔
        </span>
      </div>

      {/* ── Avatar + identité ── */}
      <div className="flex flex-col items-center px-6 pt-6 pb-4">

        {editing ? (
          /* Formulaire d'édition */
          <div className="w-full flex flex-col gap-2">
            <Input label="Nom affiché" value={displayName} onChange={e => setDisplayName(e.target.value)} />
            <Input label="Pseudo" value={username} onChange={e => setUsername(e.target.value)} autoCapitalize="none" />
            <div className="flex gap-2 mt-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuler</Button>
              <Button size="sm" fullWidth loading={saving} onClick={handleSave}>Enregistrer</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Avatar hexagonal */}
            <div className="relative mb-4">
              <div
                style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }}
                className="w-24 h-24 bg-brand/25 flex items-center justify-center"
              >
                <div
                  style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)' }}
                  className="w-[88px] h-[88px] bg-zinc-800 overflow-hidden flex items-center justify-center text-3xl font-black text-zinc-400"
                >
                  {safeAvatarUrl
                    ? <img src={safeAvatarUrl} alt={profile.display_name} className="w-full h-full object-cover" />
                    : profile.display_name?.[0]?.toUpperCase() ?? '?'
                  }
                </div>
              </div>
              {/* Badge de rang */}
              {rankInfo && (
                <div className="absolute -bottom-1 -right-2 w-7 h-7 bg-zinc-800 border-2 border-zinc-900 rounded-full flex items-center justify-center text-sm leading-none">
                  {rankInfo.rank.emoji}
                </div>
              )}
              {/* Bouton upload */}
              {isSelf && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-1 -left-2 w-7 h-7 bg-brand rounded-full flex items-center justify-center text-white text-xs hover:bg-brand-dark transition-colors disabled:opacity-50"
                    aria-label="Changer la photo"
                  >
                    {uploadingAvatar ? '…' : '📷'}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>

            {/* Nom */}
            <h1 className="text-2xl font-black text-white tracking-wide flicker">{profile.display_name}</h1>
            <p className="text-zinc-600 text-sm mt-0.5">@{profile.username}</p>

            {/* Label de rang */}
            {rankInfo && (
              <div className="mt-3 px-5 py-1.5 border-y border-brand/20 bg-brand/5 w-full text-center">
                <span className="text-[10px] font-bold uppercase tracking-[3px] text-brand">
                  ✦ {rankInfo.rank.name} ✦
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Barre XP ── */}
      {rankInfo && !editing && (
        <div className="px-6 pb-5 border-b border-zinc-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] uppercase tracking-[3px] text-zinc-600">Progression</span>
            <span className="text-[10px] font-semibold text-zinc-500 tabular-nums">
              {rankInfo.xp} / {rankInfo.xpMax} pts
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full border border-zinc-700/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand/60 to-brand rounded-full transition-[width] duration-700"
              style={{ width: `${rankInfo.progress}%` }}
            />
          </div>
          {rankInfo.nextRank ? (
            <p className="text-[9px] text-zinc-700 text-right mt-1 italic">
              {rankInfo.ptsToNext} pts avant {rankInfo.nextRank.name}
            </p>
          ) : (
            <p className="text-[9px] text-brand/50 text-right mt-1 italic">Rang maximum atteint ✦</p>
          )}
        </div>
      )}

      {/* ── Formulaire changement de mot de passe ── */}
      {isSelf && !editing && changingPwd && (
        <div className="px-6 py-4 border-b border-zinc-800 flex flex-col gap-2">
          <p className="text-[9px] font-bold uppercase tracking-[3px] text-zinc-500 mb-1">
            Changer le mot de passe
          </p>
          {pwdSuccess ? (
            <p className="text-green-400 text-sm py-1">✓ Mot de passe modifié avec succès.</p>
          ) : (
            <>
              <Input label="Mot de passe actuel" type="password" value={oldPwd}
                onChange={e => { setOldPwd(e.target.value); setPwdError(null) }} />
              <Input label="Nouveau mot de passe" type="password" value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setPwdError(null) }} />
              <Input label="Confirmer" type="password" value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setPwdError(null) }} />
              {pwdError && <p className="text-red-400 text-xs">{pwdError}</p>}
            </>
          )}
          <div className="flex gap-2 mt-1">
            <Button variant="ghost" size="sm" onClick={togglePwd}>
              {pwdSuccess ? 'Fermer' : 'Annuler'}
            </Button>
            {!pwdSuccess && (
              <Button size="sm" fullWidth loading={pwdSaving} onClick={handleChangePwd}>
                Enregistrer
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Actions (isSelf seulement) ── */}
      {isSelf && !editing && (
        <>
          <div className="grid grid-cols-4 divide-x divide-zinc-800 border-t border-zinc-800">
            <HeroActionBtn emoji="✏️" label="Modifier"     onClick={() => setEditing(true)} />
            <HeroActionBtn emoji="🔑" label="Mot de passe" onClick={togglePwd} active={changingPwd} />
            <HeroActionBtn
              emoji={THEME_META[theme].emoji}
              label={THEME_META[theme].label}
              onClick={cycleTheme}
            />
            <HeroActionBtn emoji="🚪" label="Déconnexion" onClick={signOut} />
          </div>
          <div className="px-6 py-2.5 flex justify-end border-t border-zinc-800/50">
            <Link
              to="/palmares"
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
            >
              Voir le palmarès
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function HeroActionBtn({
  emoji, label, onClick, active = false,
}: { emoji: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 py-3 transition-colors
        ${active
          ? 'bg-brand/10 text-brand'
          : 'bg-zinc-900 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800'
        }`}
    >
      <span className="text-base leading-none">{emoji}</span>
      <span className="text-[8px] font-bold uppercase tracking-widest">{label}</span>
    </button>
  )
}

// ── Section Statistiques ──────────────────────────────────────

function StatsSection({ stats }: { stats: PlayerStats }) {
  return (
    <section>
      <SectionTitle>Statistiques</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <RpgStatBox icon="⚔️" label="Matchs joués"     value={stats.matches_played} />
        <RpgStatBox icon="🏆" label="Matchs gagnés"    value={stats.matches_won}    highlight />
        <RpgStatBox icon="🎯" label="Tournois joués"   value={stats.tournaments_played} />
        <RpgStatBox icon="👑" label="Tournois gagnés"  value={stats.tournaments_won}
          highlight={stats.tournaments_won > 0} />
      </div>
      {/* Barre win rate */}
      <div className="mt-3 flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
        <span className="text-[10px] uppercase tracking-widest text-zinc-600 w-16 shrink-0">Win rate</span>
        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-700 to-green-400 rounded-full transition-[width] duration-700"
            style={{ width: `${stats.win_rate}%` }}
          />
        </div>
        <span className="text-sm font-black text-green-400 w-10 text-right tabular-nums">
          {stats.win_rate}%
        </span>
      </div>
    </section>
  )
}

function RpgStatBox({
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

// ── Section Règles Spéciales ──────────────────────────────────

function SpecialEventsSection({ stats }: { stats: PlayerStats }) {
  const events = [
    { emoji: '🔄', label: 'Balls Back',  value: stats.balls_back_count },
    { emoji: '🏓', label: 'Rebonds',     value: stats.bounce_count     },
    { emoji: '🎪', label: 'Trickshotsshots',   value: stats.trickshot_count  },
    { emoji: '💥', label: 'Game Over',   value: stats.game_over_count  },
  ]

  return (
    <section>
      <SectionTitle>Règles Spéciales</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {events.map(({ emoji, label, value }) => (
          <div
            key={label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center gap-3 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />
            <span className="text-2xl leading-none">{emoji}</span>
            <div>
              <p className="text-2xl font-black text-white leading-none tabular-nums">{value}</p>
              <p className="text-[9px] uppercase tracking-[2px] text-zinc-600 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Section Badges ────────────────────────────────────────────

function BadgesSection({ stats, settings }: { stats: PlayerStats; settings: AppSettings }) {
  return (
    <section>
      <SectionTitle>Aptitudes & Badges</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {settings.badges.map(badge => {
          const isUnlocked = stats[badge.stat] >= badge.threshold
          return (
            <div
              key={badge.id}
              className={`flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border transition-all
                ${isUnlocked
                  ? 'bg-brand/10 border-brand/30'
                  : 'bg-zinc-900 border-zinc-800 opacity-40 grayscale'
                }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                ${isUnlocked ? 'bg-brand/20' : 'bg-zinc-800'}`}
              >
                {badge.emoji}
              </div>
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-wide leading-none
                  ${isUnlocked ? 'text-brand' : 'text-zinc-500'}`}
                >
                  {badge.name}
                </p>
                <p className="text-[9px] text-zinc-600 mt-0.5">{badge.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Section Tournois ──────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  registration:   'Inscriptions',
  group_phase:    'Groupes',
  bracket_phase:  'Finales',
  finished:       'Terminé',
}

function TournamentsSection({ playerTournaments }: { playerTournaments: PlayerTournament[] }) {
  return (
    <section>
      <SectionTitle>Tournois ({playerTournaments.length})</SectionTitle>
      <div className="flex flex-col gap-2">
        {playerTournaments.map(({ tournament, teamName, won }) => (
          <div
            key={tournament.id}
            className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3
              ${won ? 'bg-brand/10 border-brand/25' : 'bg-zinc-900 border-zinc-800'}`}
          >
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">
                {won && <span className="mr-1.5">🏆</span>}
                {tournament.name}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5 truncate">{teamName}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0
              ${tournament.status === 'finished'
                ? 'bg-zinc-800 text-zinc-400'
                : 'bg-blue-900/50 text-blue-300'
              }`}
            >
              {STATUS_LABEL[tournament.status] ?? tournament.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
