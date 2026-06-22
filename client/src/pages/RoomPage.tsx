import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { socket } from '../socket'
import type { PublicRoom, PlayerResult } from '../types'
import QRJoin from '../components/QRJoin'
import Board from '../components/Board'
import DraggableBoard from '../components/DraggableBoard'
import Timer from '../components/Timer'
import PlayerList from '../components/PlayerList'
import ResultsCinematic from '../components/ResultsCinematic'
import GameLogo from '../components/GameLogo'

type Feedback = {
  word: string
  status: 'accepted' | 'rejected' | 'duplicate'
  reason?: string
}

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [searchParams] = useSearchParams()
  const playerId = searchParams.get('player') ?? sessionStorage.getItem('playerId')

  const isMobile = !!playerId

  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [results, setResults] = useState<PlayerResult[] | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [myWords, setMyWords] = useState<string[]>([])

  useEffect(() => {
    socket.connect()

    socket.on('room:state', (r: PublicRoom) => setRoom(r))

    socket.on('game:started', () => {
      setResults(null)
      setMyWords([])
    })

    socket.on('game:ended', ({ results: r }: { results: PlayerResult[] }) => {
      setResults(r)
    })

    socket.on('word:accepted-local', ({ word }: { word: string }) => {
      setMyWords(prev => [word, ...prev])
      setFeedback({ word, status: 'accepted' })
    })

    socket.on('word:rejected-local', ({ word, reason }: { word: string; reason: string }) => {
      if (reason === 'deja_envoye') {
        setFeedback({ word, status: 'duplicate', reason })
      } else {
        setFeedback({ word, status: 'rejected', reason })
      }
    })

    socket.on('error', ({ message }: { message: string }) => {
      console.error(message)
    })

    // Request current room state on (re)connect
    const syncRoom = () => {
      if (roomCode) {
        socket.emit('room:sync', { roomCode, playerId: playerId ?? undefined })
      }
    }
    socket.on('connect', syncRoom)
    syncRoom()

    return () => {
      socket.off('connect', syncRoom)
      socket.off('room:state')
      socket.off('game:started')
      socket.off('game:ended')
      socket.off('word:accepted-local')
      socket.off('word:rejected-local')
      socket.off('error')
    }
  }, [roomCode])

  const handleStart = () => {
    socket.emit('room:start', { roomCode })
  }

  const handleSettings = (gridSize: number, durationSec: number) => {
    socket.emit('room:settings', { roomCode, gridSize, durationSec })
  }

  const handleRestart = () => {
    socket.emit('room:restart')
    setResults(null)
    setMyWords([])
  }

  const handleWordSubmit = useCallback((word: string) => {
    socket.emit('word:submit', { roomCode, playerId, word })
  }, [roomCode, playerId])

  const phase = room?.phase ?? 'lobby'

  // ─── MOBILE PLAYER VIEW ───────────────────────────────────────────────────
  if (isMobile) {
    if (phase === 'results' && results) {
      return <ResultsCinematic results={results} onDone={handleRestart} hideReplay />
    }

    return (
      <div className="game-screen flex flex-col">
        {/* Header */}
        <div className="game-content flex items-center justify-between gap-2 px-3 py-3">
          <div className="status-pill bg-game-yellow px-3 py-2 text-lg text-game-purple">{roomCode}</div>
          <div className="min-w-0 truncate rounded-full bg-white px-3 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">
            {room?.players.find(p => p.id === playerId)?.name ?? ''}
          </div>
          {phase === 'playing' && room?.endsAt && (
            <div className="scale-[.62] origin-right">
              <Timer endsAt={room.endsAt} />
            </div>
          )}
        </div>

        {/* Playing phase */}
        {phase === 'playing' && room?.grid && (
          <div className="game-content flex flex-1 flex-col overflow-hidden">
            {/* Draggable board zone */}
            <div className="flex items-center justify-center p-2 pb-0">
              <DraggableBoard
                grid={room.grid}
                onSubmit={handleWordSubmit}
                lastFeedback={feedback}
                disabled={phase !== 'playing'}
              />
            </div>

            {/* Word list */}
            <div className="mx-3 mb-3 mt-2 flex-1 overflow-auto rounded-[24px] border-4 border-game-purple bg-white/90 px-4 pb-4 pt-3 shadow-cartoon">
              <div className="mb-2 text-xs font-black uppercase text-game-purple">
                Mes mots ({myWords.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {myWords.map((w, i) => (
                  <span key={i} className="word-accepted text-sm">{w}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Lobby */}
        {phase === 'lobby' && (
          <div className="game-content flex flex-1 flex-col items-center justify-center gap-6 p-6">
            <GameLogo size="sm" />
            <div className="cartoon-card w-full max-w-sm p-6 text-center">
              <div className="text-2xl font-black text-game-purple">En attente du lancement...</div>
              <div className="mt-2 font-extrabold text-game-blue">L'hôte prépare la grille</div>
            </div>
            <div className="cartoon-panel w-full max-w-sm p-4">
              <div className="text-sm font-black uppercase text-game-magenta">Astuce</div>
              <div className="mt-1 text-lg font-extrabold text-game-purple">
                Commence par repérer les terminaisons courtes.
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // ─── HOST / TV VIEW ───────────────────────────────────────────────────────
  return (
    <div className="game-screen flex flex-col overflow-hidden">
      {/* ── LOBBY ── */}
      {phase === 'lobby' && (
        <div className="game-content flex flex-1 items-center justify-center gap-10 p-8">
          {/* Left: QR + code */}
          <div className="flex flex-col items-center gap-6">
            <GameLogo size="md" />
            {roomCode && <QRJoin roomCode={roomCode} />}
          </div>

          {/* Right: settings + player list + start */}
          <div className="flex min-w-[360px] max-w-[440px] flex-col gap-5">
            {/* Settings */}
            <div className="cartoon-panel flex flex-col gap-4 p-5">
              <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Paramètres</div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-black uppercase text-game-purple">Taille de grille</div>
                <div className="flex gap-2">
                  {[4, 6].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSettings(s, room?.durationSec ?? 180)}
                      className={`segmented-option flex-1 text-lg ${
                        (room?.gridSize ?? 6) === s
                          ? 'segmented-option-selected text-game-purple'
                          : 'text-game-purple'
                      }`}
                    >
                      {s}×{s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-black uppercase text-game-purple">Durée</div>
                <div className="flex gap-2">
                  {[{label:'2 min', s:120},{label:'3 min', s:180},{label:'5 min', s:300}].map(({label, s}) => (
                    <button
                      key={s}
                      onClick={() => handleSettings(room?.gridSize ?? 6, s)}
                      className={`segmented-option flex-1 text-sm ${
                        (room?.durationSec ?? 180) === s
                          ? 'segmented-option-selected text-game-purple'
                          : 'text-game-purple'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="status-pill self-start bg-game-yellow px-4 py-1 text-xl text-game-purple">
              Joueurs ({room?.players.length ?? 0})
            </div>
            <div className="max-h-[260px] overflow-auto pr-1">
              {room && <PlayerList players={room.players} />}
            </div>

            <button onClick={handleStart} disabled={(room?.players.length ?? 0) === 0} className="btn-primary text-2xl">
              Lancer la partie
            </button>
          </div>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && room?.grid && room?.endsAt && (
        <div className="game-content flex flex-1 gap-6 overflow-hidden p-6">
          {/* Left: player scores */}
          <div className="cartoon-panel flex w-64 shrink-0 flex-col gap-4 p-4">
            <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Joueurs</div>
            <PlayerList players={room.players} showWordCount />
          </div>

          {/* Center: grid + timer */}
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <Timer endsAt={room.endsAt} />
            <Board grid={room.grid} />
          </div>

          {/* Right: stats */}
          <div className="flex w-64 shrink-0 flex-col gap-4">
            <div className="cartoon-card p-5 text-center">
              <div className="text-sm font-black uppercase text-game-purple">Total mots</div>
              <div className="cartoon-title-sm font-display text-7xl text-game-magenta">
                {room.players.reduce((s, p) => s + p.wordCount, 0)}
              </div>
            </div>
            <div className="cartoon-card p-5">
              <div className="text-sm font-black uppercase text-game-purple">Mission</div>
              <div className="mt-2 text-xl font-black text-game-blue">Trouvez le plus de mots uniques.</div>
              <div className="mt-4 h-5 rounded-full border-[3px] border-game-purple bg-white p-0.5">
                <div className="h-full animate-progress-fill rounded-full bg-game-magenta" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS cinematic (host only) ── */}
      {phase === 'results' && results && (
        <ResultsCinematic results={results} onDone={handleRestart} />
      )}
    </div>
  )
}
