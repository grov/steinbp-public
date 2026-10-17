import type { MatchWithRelations, Team, Tournament } from '../../types/database'
import { ScorePill, matchSides, type PillTone } from './ScorePill'
import { formatTime } from './MatchRow'

interface BracketViewProps {
  matches: MatchWithRelations[]
  tournament: Tournament
  onMatchClick?: (match: MatchWithRelations) => void
  myTeamIds?: string[]
}

// Géométrie du tableau (px). Un match occupe deux lignes d'équipe.
const COLUMN_WIDTH = 200
const CONNECTOR_WIDTH = 32
const ROW_HEIGHT = 36
const ROW_GAP = 6
const SLOT_HEIGHT = 116 // hauteur d'un match du 1er tour, libellé compris
const LINE = 'border-[#f2c200]'

/**
 * Tableau à élimination directe, défilant horizontalement : chaque tour est
 * une colonne, reliée au tour suivant par des traits.
 */
export function BracketView({ matches, tournament, onMatchClick, myTeamIds = [] }: BracketViewProps) {
  const bracketMatches = matches.filter((m) => m.phase === 'bracket')
  if (bracketMatches.length === 0) return <EmptyBracket />

  const rounds = groupByRound(bracketMatches)
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b)
  const maxRound = roundNumbers[roundNumbers.length - 1]
  const height = rounds[roundNumbers[0]].length * SLOT_HEIGHT

  return (
    <div>
      {roundNumbers.length > 2 && (
        <p className="text-zinc-500 text-sm mb-4 lg:hidden">
          Fais glisser horizontalement pour voir la suite du tableau
        </p>
      )}

      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="flex w-max">
          {roundNumbers.map((round, roundIndex) => {
            const isLast = roundIndex === roundNumbers.length - 1
            return (
              <div
                key={round}
                style={{ width: COLUMN_WIDTH, marginRight: isLast ? 0 : CONNECTOR_WIDTH }}
                className="shrink-0"
              >
                <h3 className="text-white font-semibold text-lg mb-6 whitespace-nowrap">
                  {roundLabel(round, maxRound)}
                </h3>
                <div style={{ height }} className="flex flex-col">
                  {rounds[round].map((match, index) => (
                    <div key={match.id} className="relative flex-1 flex items-center">
                      {roundIndex > 0 && <IncomingLine />}
                      {!isLast && <OutgoingLines isTop={index % 2 === 0} />}
                      <BracketMatch
                        match={match}
                        tournament={tournament}
                        myTeamIds={myTeamIds}
                        onClick={onMatchClick}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Traits de liaison ─────────────────────────────────────────

function IncomingLine() {
  return (
    <span
      aria-hidden
      className={`absolute top-1/2 border-t-2 ${LINE}`}
      style={{ left: -CONNECTOR_WIDTH / 2, width: CONNECTOR_WIDTH / 2 }}
    />
  )
}

/** Trait horizontal vers la droite + demi-trait vertical vers le match voisin. */
function OutgoingLines({ isTop }: { isTop: boolean }) {
  return (
    <>
      <span
        aria-hidden
        className={`absolute top-1/2 border-t-2 ${LINE}`}
        style={{ left: COLUMN_WIDTH, width: CONNECTOR_WIDTH / 2 }}
      />
      <span
        aria-hidden
        className={`absolute border-l-2 ${LINE}`}
        style={{
          left: COLUMN_WIDTH + CONNECTOR_WIDTH / 2 - 2,
          top: isTop ? '50%' : 0,
          height: 'calc(50% + 2px)',
        }}
      />
    </>
  )
}

// ── Match ─────────────────────────────────────────────────────

function BracketMatch({
  match,
  tournament,
  myTeamIds,
  onClick,
}: {
  match: MatchWithRelations
  tournament: Tournament
  myTeamIds: string[]
  onClick?: (match: MatchWithRelations) => void
}) {
  const sides = matchSides(match, tournament)
  const isClickable = !!onClick && ['ready', 'in_progress'].includes(match.status)
  const label = match.table
    ? `${match.table.name}${match.started_at ? ` · ${formatTime(match.started_at)}` : ''}`
    : null

  return (
    <div
      role={isClickable ? 'button' : undefined}
      onClick={() => isClickable && onClick(match)}
      className={`relative w-full flex flex-col ${isClickable ? 'cursor-pointer active:scale-98 transition-transform' : ''}`}
      style={{ gap: ROW_GAP }}
    >
      {label && (
        <span
          className={`absolute bottom-full mb-1 text-xs whitespace-nowrap ${
            match.status === 'in_progress' ? 'text-green-400 font-semibold' : 'text-zinc-500'
          }`}
        >
          {match.status === 'in_progress' && '● '}
          {label}
        </span>
      )}
      <TeamRow team={match.team1} score={sides.cups1} tone={sides.tone1} isMine={isMine(match.team1, myTeamIds)} />
      <TeamRow team={match.team2} score={sides.cups2} tone={sides.tone2} isMine={isMine(match.team2, myTeamIds)} />
    </div>
  )
}

function isMine(team: Team | null, myTeamIds: string[]): boolean {
  return !!team && myTeamIds.includes(team.id)
}

function TeamRow({
  team,
  score,
  tone,
  isMine,
}: {
  team: Team | null
  score: number | null
  tone: PillTone
  isMine: boolean
}) {
  const name = !team ? '' : team.is_bye ? '—' : team.name
  const isEliminated = tone === 'loss'

  return (
    <div
      style={{ height: ROW_HEIGHT }}
      className={`flex items-center gap-2 pl-3 rounded-lg overflow-hidden
        ${isMine ? 'bg-highlight text-black' : 'bg-zinc-900 text-white'}`}
    >
      <span className={`flex-1 min-w-0 truncate text-sm ${isEliminated && !isMine ? 'text-zinc-500' : ''}`}>
        {name || <span className="text-zinc-600">À déterminer</span>}
      </span>
      {score !== null && <ScorePill value={score} tone={tone} size="sm" />}
    </div>
  )
}

// ── Utilitaires ───────────────────────────────────────────────

function groupByRound(matches: MatchWithRelations[]): Record<number, MatchWithRelations[]> {
  const rounds: Record<number, MatchWithRelations[]> = {}
  for (const m of matches) (rounds[m.round] ??= []).push(m)
  for (const list of Object.values(rounds)) list.sort((a, b) => a.match_number - b.match_number)
  return rounds
}

const ROUND_LABELS = [
  'Finale',
  'Demi-finales',
  'Quarts de finale',
  'Huitièmes de finale',
  'Seizièmes de finale',
  'Trente-deuxièmes de finale',
]

export function roundLabel(round: number, maxRound: number): string {
  return ROUND_LABELS[maxRound - round] ?? `Tour ${round}`
}

function EmptyBracket() {
  return (
    <div className="text-center py-12 text-zinc-600">
      <p className="text-4xl mb-3">🎯</p>
      <p>Le tableau n'a pas encore été généré.</p>
    </div>
  )
}
