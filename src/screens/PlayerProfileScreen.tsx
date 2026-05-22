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
import { pb } from '../lib/pocketbase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import type { Player, PlayerStats, Team } from '../types/database'

export function PlayerProfileScreen() {
  const { id } = useParams<{ id?: string }>()
  const { player: selfPlayer, refreshPlayer, isManager } = useAuth()
  const navigate = useNavigate()

  // id dans l'URL → profil public ; pas d'id → propre profil
  const targetId = id ?? selfPlayer?.id
  const isSelf = !id || id === selfPlayer?.id

  const [profile, setProfile] = useState<Player | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [playerTournaments, setPlayerTournaments] = useState<PlayerTournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Ref pour éviter que refreshPlayer() dans AuthContext déclenche le useEffect
  const selfPlayerRef = useRef(selfPlayer)
  selfPlayerRef.current = selfPlayer

  // Effect 1 : chargement de l'identité du profil
  useEffect(() => {
    if (!targetId) return

    if (isSelf) {
      const sp = selfPlayerRef.current
      setProfile(sp)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    fetchPublicPlayer(targetId)
      .then((p) => {
        if (!active) return
        if (!p) setError('not found')
        else setProfile(p)
      })
      .catch((e: unknown) => {
        if (!active) return
        if ((e as { isAbort?: boolean })?.isAbort) return
        setError(e instanceof Error ? e.message : 'Erreur inconnue')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [targetId, isSelf])

  // Effect 2 : données secondaires (stats, équipes, tournois)
  useEffect(() => {
    if (!targetId) return
    let active = true

    Promise.all([
      fetchPlayerStats(targetId),
      pb.collection('teams').getFullList({
        filter: `player1_id = "${targetId}" || player2_id = "${targetId}"`,
        requestKey: `teams-${targetId}`,
      }).then((recs) => recs.map((r) => ({
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
      .then(([s, t, pt]) => {
        if (!active) return
        setStats(s as PlayerStats)
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
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">
        Chargement…
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600 text-center px-4">
        <div>
          <p className="text-4xl mb-3">🔍</p>
          <p>Profil introuvable ou non approuvé.</p>
        </div>
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
      <div className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Carte profil */}
        <ProfileCard
          profile={profile}
          isSelf={isSelf}
          selfPlayerRef={selfPlayerRef}
          onUpdated={async () => {
            await refreshPlayer()
            if (isSelf) {
              setProfile(selfPlayerRef.current)
            } else if (targetId) {
              const p = await fetchPublicPlayer(targetId)
              setProfile(p)
            }
          }}
        />

        {/* Statistiques */}
        {stats && <StatsCard stats={stats} />}

        {/* Tournois */}
        {playerTournaments.length > 0 && <TournamentsHistoryCard playerTournaments={playerTournaments} />}

        {/* Équipes */}
        {teams.length > 0 && <TeamsCard teams={teams} />}
      </div>
    </div>
  )
}

// ── Carte profil + édition ────────────────────────────────────

function ProfileCard({
  profile,
  isSelf,
  selfPlayerRef,
  onUpdated,
}: {
  profile: Player
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
  const [changingPwd, setChangingPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { signOut, refreshPlayer } = useAuth()

  function openChangePwd() {
    setOldPwd(''); setNewPwd(''); setConfirmPwd('')
    setPwdError(null); setPwdSuccess(false)
    setChangingPwd(true)
  }

  async function handleChangePwd() {
    if (!oldPwd || !newPwd || !confirmPwd) { setPwdError('Tous les champs sont requis.'); return }
    if (newPwd.length < 8) { setPwdError('Le nouveau mot de passe doit faire au moins 8 caractères.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas.'); return }
    setPwdSaving(true); setPwdError(null)
    try {
      await changePassword(profile.id, oldPwd, newPwd)
      setPwdSuccess(true)
      setOldPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : 'Mot de passe actuel incorrect.')
    } finally {
      setPwdSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile(profile.id, { display_name: displayName.trim(), username: username.trim() })
      setEditing(false)
      onUpdated()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Image trop lourde (2 Mo max).'); return }

    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(profile.id, file)
      setAvatarUrl(url + '?t=' + Date.now())
      // Met à jour le ref local et sync AuthContext sans déclencher de rechargement de page
      if (selfPlayerRef.current) selfPlayerRef.current = { ...selfPlayerRef.current, avatar_url: url }
      await refreshPlayer()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur upload.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
      <div className="flex items-start gap-5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt={profile.display_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">
                {profile.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
          {isSelf && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand rounded-full flex items-center
                           justify-center text-white text-sm hover:bg-brand-dark transition-colors
                           disabled:opacity-50"
                aria-label="Changer la photo"
              >
                {uploadingAvatar ? '…' : '📷'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex flex-col gap-2">
              <Input
                label="Nom affiché"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Input
                label="Pseudo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoCapitalize="none"
              />
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Annuler</Button>
                <Button size="sm" fullWidth loading={saving} onClick={handleSave}>Enregistrer</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-black text-white leading-tight">{profile.display_name}</h1>
              <p className="text-zinc-500 text-sm mt-0.5">@{profile.username}</p>
              {isSelf && (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-2 text-xs text-brand hover:text-brand-dark transition-colors"
                >
                  Modifier le profil
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isSelf && !editing && (
        <div className="mt-5 flex flex-col gap-3">
          {/* Formulaire changement de mot de passe */}
          {changingPwd ? (
            <div className="flex flex-col gap-2 bg-zinc-800 rounded-xl p-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Changer le mot de passe</p>
              {pwdSuccess ? (
                <p className="text-green-400 text-sm">Mot de passe modifié avec succès.</p>
              ) : (
                <>
                  <Input
                    label="Mot de passe actuel"
                    type="password"
                    value={oldPwd}
                    onChange={(e) => { setOldPwd(e.target.value); setPwdError(null) }}
                  />
                  <Input
                    label="Nouveau mot de passe"
                    type="password"
                    value={newPwd}
                    onChange={(e) => { setNewPwd(e.target.value); setPwdError(null) }}
                  />
                  <Input
                    label="Confirmer le nouveau mot de passe"
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => { setConfirmPwd(e.target.value); setPwdError(null) }}
                  />
                  {pwdError && <p className="text-red-400 text-xs">{pwdError}</p>}
                </>
              )}
              <div className="flex gap-2 mt-1">
                <Button variant="ghost" size="sm" onClick={() => setChangingPwd(false)}>
                  {pwdSuccess ? 'Fermer' : 'Annuler'}
                </Button>
                {!pwdSuccess && (
                  <Button size="sm" fullWidth loading={pwdSaving} onClick={handleChangePwd}>
                    Enregistrer
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={openChangePwd}
              className="text-xs text-brand hover:text-brand-dark transition-colors text-left"
            >
              Changer le mot de passe
            </button>
          )}

          <div className="flex items-center justify-between">
            <Link
              to="/palmares"
              className="text-xs text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
            >
              Voir le palmarès
            </Link>
            <button
              onClick={signOut}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Statistiques ──────────────────────────────────────────────

function StatsCard({ stats }: { stats: PlayerStats }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
        Statistiques
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Matchs joués" value={stats.matches_played} />
        <StatBox label="Matchs gagnés" value={stats.matches_won} highlight />
        <StatBox label="Taux de victoire" value={`${stats.win_rate}%`} />
        <StatBox label="Tournois joués" value={stats.tournaments_played} />
        <StatBox
          label="Tournois gagnés"
          value={stats.tournaments_won}
          highlight={stats.tournaments_won > 0}
          emoji={stats.tournaments_won > 0 ? '🏆' : undefined}
        />
      </div>
    </section>
  )
}

function StatBox({
  label,
  value,
  highlight = false,
  emoji,
}: {
  label: string
  value: number | string
  highlight?: boolean
  emoji?: string
}) {
  return (
    <div
      className={`rounded-2xl p-4 border ${
        highlight
          ? 'bg-brand/10 border-brand/30'
          : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <p className={`text-3xl font-black ${highlight ? 'text-brand' : 'text-white'}`}>
        {emoji && <span className="mr-1">{emoji}</span>}
        {value}
      </p>
      <p className="text-zinc-500 text-xs mt-1">{label}</p>
    </div>
  )
}

// ── Tournois du joueur ────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  registration: 'Inscriptions',
  group_phase: 'Phase de groupes',
  bracket_phase: 'Phases finales',
  finished: 'Terminé',
}

function TournamentsHistoryCard({ playerTournaments }: { playerTournaments: PlayerTournament[] }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
        Tournois ({playerTournaments.length})
      </h2>
      <div className="flex flex-col gap-2">
        {playerTournaments.map(({ tournament, teamName, won }) => (
          <div
            key={tournament.id}
            className={`rounded-xl px-4 py-3 border flex items-center justify-between gap-3 ${
              won
                ? 'bg-brand/10 border-brand/30'
                : 'bg-zinc-900 border-zinc-800'
            }`}
          >
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm truncate">
                {won && <span className="mr-1.5">🏆</span>}
                {tournament.name}
              </p>
              <p className="text-zinc-500 text-xs mt-0.5 truncate">{teamName}</p>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
              tournament.status === 'finished'
                ? 'bg-zinc-800 text-zinc-400'
                : 'bg-blue-900/50 text-blue-300'
            }`}>
              {STATUS_LABEL[tournament.status] ?? tournament.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Équipes du joueur ─────────────────────────────────────────

function TeamsCard({ teams }: { teams: Team[] }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">
        Équipes ({teams.length})
      </h2>
      <div className="flex flex-col gap-2">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3"
          >
            <p className="font-semibold text-white">{team.name}</p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {[team.player1_name, team.player2_name].filter(Boolean).join(' & ')}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
