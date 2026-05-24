import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { editMatchResult, finishMatch, startMatch, unassignTable } from '../lib/tournamentActions'
import { MatchCard } from '../components/tournament/MatchCard'
import { ScoreModal } from '../components/tournament/ScoreModal'
import { BracketView } from '../components/tournament/BracketView'
import { GroupStandings } from '../components/tournament/GroupStandings'
import { SettingsTab } from '../components/tournament/SettingsTab'
import { StatsTab } from '../components/tournament/StatsTab'
import { TournamentStatusBadge } from '../components/ui/Badge'
import type { MatchWithRelations, SpecialEvents } from '../types/database'

type Tab = 'queue' | 'bracket' | 'standings' | 'stats' | 'config'

export function TournamentDashboard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { tournament, teams, tables, matches, groups, loading, silentReload } = useTournament(id)

  const [activeTab, setActiveTab] = useState<Tab>('queue')
  const [scoreMatch, setScoreMatch] = useState<MatchWithRelations | null>(null)
  const [editMatch, setEditMatch] = useState<MatchWithRelations | null>(null)
  const [locallyStarted, setLocallyStarted] = useState(false)
  const [locallyFinished, setLocallyFinished] = useState(false)

  if (loading || !tournament) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">
        Chargement…
      </div>
    )
  }

  const availableTables = tables.filter((t) => t.is_available)
  const inProgressMatches = matches.filter((m) => m.status === 'in_progress')
  const readyMatches = matches.filter((m) => m.status === 'ready')
  const pendingMatches = matches.filter((m) => m.status === 'pending')
  const finishedMatches = matches.filter((m) => m.status === 'finished')

  const showStandingsTab = tournament.format === 'group_then_elimination'

  async function handleAssignTable(matchId: string, tableId: string) {
    await startMatch(matchId, tableId)
    silentReload()
  }

  async function handleEnterScore(winnerId: string, cupsRemaining: number, specialEvents: SpecialEvents) {
    if (!scoreMatch) return
    await finishMatch(scoreMatch, winnerId, cupsRemaining, tournament!.cups_per_side, specialEvents)
    silentReload()
  }

  async function handleUnassign(match: MatchWithRelations) {
    await unassignTable(match)
    silentReload()
  }

  async function handleEditScore(winnerId: string, cupsRemaining: number, specialEvents: SpecialEvents) {
    if (!editMatch) return
    await editMatchResult(editMatch, winnerId, cupsRemaining, tournament!.cups_per_side, specialEvents)
    silentReload()
  }

  const isStarted = (tournament?.status !== 'registration') || locallyStarted
  const isFinished = (tournament?.status === 'finished') || locallyFinished

  const realTeams = teams.filter((t) => !t.is_bye)

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <button
                onClick={() => navigate('/')}
                className="text-zinc-500 hover:text-white transition-colors text-sm"
              >
                ←
              </button>
              <h1 className="text-xl font-bold">{tournament.name}</h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <TournamentStatusBadge status={tournament.status} />
              <span>{realTeams.length} équipes</span>
              <span>{tables.length} tables</span>
            </div>
          </div>

        </div>
      </header>

      {/* Navigation par onglets */}
      <nav className="bg-zinc-900 border-b border-zinc-800 flex-shrink-0">
        <div className="max-w-2xl mx-auto flex">
          <TabButton active={activeTab === 'queue'} onClick={() => setActiveTab('queue')}>
            Matchs
          </TabButton>
          <TabButton active={activeTab === 'bracket'} onClick={() => setActiveTab('bracket')}>
            Tableau
          </TabButton>
          {showStandingsTab && (
            <TabButton active={activeTab === 'standings'} onClick={() => setActiveTab('standings')}>
              Classements
            </TabButton>
          )}
          <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>
            Stats
          </TabButton>
          <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')}>
            ⚙ Config
          </TabButton>
        </div>
      </nav>

      {/* Contenu */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5">
          {activeTab === 'queue' && (
            <QueueView
              inProgress={inProgressMatches}
              ready={readyMatches}
              pending={pendingMatches}
              finished={finishedMatches}
              availableTables={availableTables}
              onAssignTable={handleAssignTable}
              onEnterScore={setScoreMatch}
              onUnassign={handleUnassign}
              onEditScore={setEditMatch}
            />
          )}

          {activeTab === 'bracket' && (
            <BracketView
              matches={matches}
              onMatchClick={(m) => {
                if (m.status === 'in_progress') setScoreMatch(m)
              }}
            />
          )}

          {activeTab === 'standings' && showStandingsTab && (
            <GroupStandings groups={groups} />
          )}

          {activeTab === 'stats' && (
            <StatsTab teams={teams} matches={matches} cupsPerSide={tournament.cups_per_side} />
          )}

          {activeTab === 'config' && (
            <SettingsTab
              tournament={tournament!}
              teams={teams}
              tables={tables}
              isStarted={isStarted}
              isFinished={isFinished}
              onRefresh={silentReload}
              onStarted={() => setLocallyStarted(true)}
              onFinished={() => setLocallyFinished(true)}
            />
          )}
        </div>
      </main>

      {/* Modal de score */}
      <ScoreModal
        key={scoreMatch?.id ?? 'score-closed'}
        match={scoreMatch}
        cupsPerSide={tournament.cups_per_side}
        onConfirm={handleEnterScore}
        onClose={() => setScoreMatch(null)}
      />

      {/* Modal d'édition de score */}
      <ScoreModal
        key={(editMatch?.id ?? 'edit-closed') + '-edit'}
        match={editMatch}
        cupsPerSide={tournament.cups_per_side}
        editMode
        onConfirm={handleEditScore}
        onClose={() => setEditMatch(null)}
      />
    </div>
  )
}

// ── Vue file d'attente ────────────────────────────────────────

function QueueView({
  inProgress,
  ready,
  pending,
  finished,
  availableTables,
  onAssignTable,
  onEnterScore,
  onUnassign,
  onEditScore,
}: {
  inProgress: MatchWithRelations[]
  ready: MatchWithRelations[]
  pending: MatchWithRelations[]
  finished: MatchWithRelations[]
  availableTables: MatchWithRelations['table'][]
  onAssignTable: (matchId: string, tableId: string) => void
  onEnterScore: (m: MatchWithRelations) => void
  onUnassign: (m: MatchWithRelations) => void
  onEditScore: (m: MatchWithRelations) => void
}) {
  const tables = availableTables.filter(Boolean) as NonNullable<MatchWithRelations['table']>[]
  const allDone = inProgress.length === 0 && ready.length === 0 && pending.length === 0

  return (
    <div className="flex flex-col gap-7">
      {/* En cours */}
      {inProgress.length > 0 && (
        <Section title={`En cours (${inProgress.length})`} color="green">
          {inProgress.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              availableTables={tables}
              onAssignTable={onAssignTable}
              onEnterScore={onEnterScore}
              onUnassign={onUnassign}
            />
          ))}
        </Section>
      )}

      {/* Prêts (en attente de table) */}
      {ready.length > 0 && (
        <Section title={`Prêts — en attente de table (${ready.length})`} color="yellow">
          {ready.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              availableTables={tables}
              onAssignTable={onAssignTable}
              onEnterScore={onEnterScore}
            />
          ))}
        </Section>
      )}

      {/* En attente (équipes TBD) */}
      {pending.length > 0 && (
        <Section title={`En attente (${pending.length})`} color="zinc">
          {pending.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              availableTables={tables}
              onAssignTable={onAssignTable}
              onEnterScore={onEnterScore}
              compact
            />
          ))}
        </Section>
      )}

      {allDone && finished.length > 0 && (
        <div className="text-center py-8 text-zinc-600">
          <p className="text-4xl mb-2">🏆</p>
          <p className="text-base font-bold text-zinc-400">Tous les matchs sont terminés !</p>
        </div>
      )}

      {/* Terminés */}
      {finished.length > 0 && (
        <Section title={`Terminés (${finished.length})`} color="zinc">
          {[...finished].reverse().map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              availableTables={[]}
              onAssignTable={() => {}}
              onEnterScore={() => {}}
              onEditScore={onEditScore}
              compact
            />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({
  title,
  color,
  children,
}: {
  title: string
  color: 'green' | 'yellow' | 'zinc'
  children: React.ReactNode
}) {
  const colors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    zinc: 'text-zinc-500',
  }
  return (
    <div>
      <h2 className={`text-xs font-bold uppercase tracking-widest mb-3 ${colors[color]}`}>
        {title}
      </h2>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors
        ${active ? 'border-brand text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
    >
      {children}
    </button>
  )
}
