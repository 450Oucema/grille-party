import type { PublicPlayer } from '../types'
import { AVATARS } from '../types'

type Props = {
  players: PublicPlayer[]
  showWordCount?: boolean
}

export default function PlayerList({ players, showWordCount = false }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {players.map((p) => (
        <div
          key={p.id}
          className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
            p.connected
              ? 'bg-game-blue border-blue-500'
              : 'bg-gray-800 border-gray-600 opacity-50'
          }`}
        >
          <div className="text-3xl">{AVATARS[p.avatar % AVATARS.length]}</div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-lg truncate">{p.name}</div>
            {showWordCount && (
              <div className="text-blue-300 text-sm">{p.wordCount} mots</div>
            )}
          </div>
          {!p.connected && (
            <div className="text-xs text-gray-400">déco</div>
          )}
        </div>
      ))}
    </div>
  )
}
