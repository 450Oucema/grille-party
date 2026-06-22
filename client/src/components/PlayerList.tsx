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
          className={`flex items-center gap-3 rounded-3xl border-[3px] p-3 shadow-cartoon-sm transition-all ${
            p.connected
              ? 'border-game-purple bg-white'
              : 'border-game-purple bg-game-lilac opacity-60'
          }`}
        >
          <div className="avatar-token h-12 w-12 text-2xl">{AVATARS[p.avatar % AVATARS.length]}</div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-lg font-black text-game-purple">{p.name}</div>
            {showWordCount && (
              <div className="text-sm font-extrabold text-game-blue">{p.wordCount} mots</div>
            )}
          </div>
          {!p.connected && (
            <div className="rounded-full bg-game-purple px-2 py-1 text-xs font-black text-white">déco</div>
          )}
        </div>
      ))}
    </div>
  )
}
