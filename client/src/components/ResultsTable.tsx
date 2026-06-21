import type { PlayerResult } from '../types'
import { AVATARS } from '../types'

type Props = {
  results: PlayerResult[]
  myPlayerId?: string
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ResultsTable({ results, myPlayerId }: Props) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {results.map((r, i) => (
        <div
          key={r.playerId}
          className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${
            r.playerId === myPlayerId
              ? 'bg-game-yellow/20 border-game-yellow'
              : 'bg-game-blue border-blue-600'
          }`}
        >
          <div className="text-3xl w-10 text-center">
            {MEDALS[i] ?? <span className="text-gray-400">{i + 1}</span>}
          </div>
          <div className="text-3xl">{AVATARS[r.avatar % AVATARS.length]}</div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-xl truncate">{r.playerName}</div>
            <div className="text-blue-300 text-sm">
              {r.wordCount} mot{r.wordCount !== 1 ? 's' : ''} valide{r.wordCount !== 1 ? 's' : ''}
              {r.bestWord && <span> · meilleur : <span className="text-game-yellow font-black">{r.bestWord}</span></span>}
            </div>
          </div>
          <div
            className="font-black text-3xl text-game-yellow"
            style={{ textShadow: '0 0 10px rgba(255,204,0,0.6)' }}
          >
            {r.totalScore}
          </div>
        </div>
      ))}
    </div>
  )
}
