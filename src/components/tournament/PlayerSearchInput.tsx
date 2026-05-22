import { useEffect, useRef, useState } from 'react'
import { pb, fileUrl } from '../../lib/pocketbase'
import type { RecordModel } from 'pocketbase'
import type { Player } from '../../types/database'

type PlayerOption = Pick<Player, 'id' | 'display_name' | 'username' | 'avatar_url'>

interface Props {
  label: string
  name: string
  playerId: string | null
  onChangeName: (name: string) => void
  onSelectPlayer: (player: PlayerOption | null) => void
  placeholder?: string
}

function recordToPlayerOption(record: RecordModel): PlayerOption {
  return {
    id: record.id,
    display_name: record['display_name'] as string,
    username: record['username'] as string,
    avatar_url: fileUrl(record, record['avatar'] as string | null),
  }
}

function Avatar({ player }: { player: PlayerOption }) {
  return (
    <div className="w-7 h-7 rounded-full bg-zinc-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
      {player.avatar_url ? (
        <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-bold text-zinc-400">
          {player.display_name[0].toUpperCase()}
        </span>
      )}
    </div>
  )
}

export function PlayerSearchInput({
  label,
  name,
  playerId,
  onChangeName,
  onSelectPlayer,
  placeholder = 'Rechercher un joueur…',
}: Props) {
  const [query, setQuery] = useState(name)
  const [results, setResults] = useState<PlayerOption[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<PlayerOption | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!playerId) return
    pb.collection('users').getOne(playerId, { fields: 'id,display_name,username,avatar,collectionId,collectionName' })
      .then((record) => {
        const opt = recordToPlayerOption(record)
        setSelected(opt)
        setQuery(opt.display_name)
      })
      .catch(() => { /* joueur non trouvé */ })
  }, [playerId])

  useEffect(() => {
    if (selected) return
    clearTimeout(debounceRef.current)

    if (!query.trim() || query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const q = query.trim().replace(/"/g, '')
      const result = await pb.collection('users').getList(1, 6, {
        filter: `status = "approved" && (display_name ~ "${q}" || username ~ "${q}")`,
        fields: 'id,display_name,username,avatar,collectionId,collectionName',
      })
      setResults(result.items.map(recordToPlayerOption))
      setOpen(true)
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query, selected])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  function handleSelect(player: PlayerOption) {
    setSelected(player)
    setQuery(player.display_name)
    setOpen(false)
    setResults([])
    onChangeName(player.display_name)
    onSelectPlayer(player)
  }

  function handleClear() {
    setSelected(null)
    setQuery('')
    onChangeName('')
    onSelectPlayer(null)
  }

  function handleInput(value: string) {
    if (selected) {
      setSelected(null)
      onSelectPlayer(null)
    }
    setQuery(value)
    onChangeName(value)
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-400">{label}</span>

      {selected ? (
        <div className="flex items-center gap-2 bg-zinc-900 border border-brand/40 rounded-lg px-3 py-2 min-h-[2.375rem]">
          <Avatar player={selected} />
          <span className="flex-1 text-sm text-white truncate">{selected.display_name}</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-zinc-500 hover:text-white transition-colors text-xs leading-none p-0.5"
            aria-label="Désélectionner"
          >
            ✕
          </button>
        </div>
      ) : (
        <input
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder={placeholder}
          className="rounded-lg bg-zinc-900 border border-zinc-700 text-white text-sm px-3 py-2
                     placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand
                     focus:border-transparent min-h-[2.375rem]"
        />
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700
                        rounded-xl overflow-hidden shadow-xl z-30">
          {results.map((player) => (
            <button
              key={player.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(player) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-700
                         transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-zinc-400">
                    {player.display_name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{player.display_name}</p>
                <p className="text-xs text-zinc-500">@{player.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
