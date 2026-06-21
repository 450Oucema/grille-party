import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { socket } from '../socket'
import type { PublicRoom, PlayerResult } from '../types'
import QRJoin from '../components/QRJoin'
import Board from '../components/Board'
import DraggableBoard from '../components/DraggableBoard'
import Timer from '../components/Timer'
import PlayerList from '../components/PlayerList'
import ResultsTable from '../components/ResultsTable'
import ResultsCinematic from '../components/ResultsCinematic'

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
    return (
      <div
        className="w-screen h-screen flex flex-col"
        style={{ background: 'radial-gradient(ellipse, #1e3a8a 0%, #1a0a5e 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-blue-700">
          <div className="font-black text-xl text-game-yellow">{roomCode}</div>
          <div className="text-blue-300 text-sm">
            {room?.players.find(p => p.id === playerId)?.name ?? ''}
          </div>
          {phase === 'playing' && room?.endsAt && (
            <div className="text-right">
              <Timer endsAt={room.endsAt} />
            </div>
          )}
        </div>

        {/* Playing phase */}
        {phase === 'playing' && room?.grid && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Draggable board zone */}
            <div className="flex items-center justify-center p-3 pb-0">
              <DraggableBoard
                grid={room.grid}
                onSubmit={handleWordSubmit}
                lastFeedback={feedback}
                disabled={phase !== 'playing'}
              />
            </div>

            {/* Word list */}
            <div className="flex-1 overflow-auto px-4 pb-4 pt-2">
              <div className="text-blue-300 text-xs mb-2 font-bold uppercase tracking-wide">
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
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
            <div className="text-6xl animate-bounce">⏳</div>
            <div className="text-2xl font-black text-game-yellow text-center">
              En attente du lancement…
            </div>
            <div className="text-blue-300 text-center">
              L'hôte va démarrer la partie
            </div>
          </div>
        )}

        {/* Results */}
        {phase === 'results' && results && (
          <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
            <div className="text-2xl font-black text-game-yellow text-center">Résultats !</div>
            {(() => {
              const me = results.find(r => r.playerId === playerId)
              return me ? (
                <div className="bg-game-blue rounded-2xl p-4 border-2 border-game-yellow text-center">
                  <div className="text-4xl font-black text-game-yellow">{me.totalScore} pts</div>
                  <div className="text-blue-300">{me.wordCount} mots valides</div>
                </div>
              ) : null
            })()}
            <ResultsTable results={results} myPlayerId={playerId ?? undefined} />
          </div>
        )}
      </div>
    )
  }

  // ─── HOST / TV VIEW ───────────────────────────────────────────────────────
  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #1e3a8a 0%, #1a0a5e 60%, #0a0030 100%)',
      }}
    >
      {/* ── LOBBY ── */}
      {phase === 'lobby' && (
        <div className="flex-1 flex items-center justify-center gap-16 p-8">
          {/* Left: QR + code */}
          <div className="flex flex-col items-center gap-6">
            <div
              className="text-5xl font-black text-game-yellow text-center"
              style={{ textShadow: '0 0 20px rgba(255,204,0,0.5)' }}
            >
              GRILLE PARTY
            </div>
            {roomCode && <QRJoin roomCode={roomCode} />}
          </div>

          {/* Right: settings + player list + start */}
          <div className="flex flex-col gap-5 min-w-72">
            {/* Settings */}
            <div className="bg-game-blue/50 rounded-2xl p-4 border border-blue-600 flex flex-col gap-3">
              <div className="text-blue-300 font-bold text-sm uppercase tracking-wide">Paramètres</div>
              <div className="flex flex-col gap-2">
                <div className="text-white font-bold text-sm">Grille</div>
                <div className="flex gap-2">
                  {[4, 6].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSettings(s, room?.durationSec ?? 180)}
                      className={`flex-1 py-2 rounded-xl font-black text-lg border-2 transition-all ${
                        (room?.gridSize ?? 6) === s
                          ? 'bg-game-yellow text-game-bg border-yellow-500'
                          : 'bg-game-blue text-white border-blue-500 hover:border-blue-300'
                      }`}
                    >
                      {s}×{s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-white font-bold text-sm">Durée</div>
                <div className="flex gap-2">
                  {[{label:'2 min', s:120},{label:'3 min', s:180},{label:'5 min', s:300}].map(({label, s}) => (
                    <button
                      key={s}
                      onClick={() => handleSettings(room?.gridSize ?? 6, s)}
                      className={`flex-1 py-2 rounded-xl font-black text-sm border-2 transition-all ${
                        (room?.durationSec ?? 180) === s
                          ? 'bg-game-yellow text-game-bg border-yellow-500'
                          : 'bg-game-blue text-white border-blue-500 hover:border-blue-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-2xl font-black text-white">
              Joueurs ({room?.players.length ?? 0})
            </div>
            {room && <PlayerList players={room.players} />}

            {(room?.players.length ?? 0) > 0 && (
              <button onClick={handleStart} className="btn-primary text-2xl">
                🚀 Lancer la partie !
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && room?.grid && room?.endsAt && (
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Left: player scores */}
          <div className="w-56 flex flex-col gap-4 shrink-0">
            <div className="text-blue-300 font-bold text-lg">Joueurs</div>
            <PlayerList players={room.players} showWordCount />
          </div>

          {/* Center: grid + timer */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <Timer endsAt={room.endsAt} />
            <Board grid={room.grid} />
          </div>

          {/* Right: stats */}
          <div className="w-56 flex flex-col gap-4 shrink-0 items-end text-right">
            <div className="text-blue-300 font-bold text-lg">Total mots</div>
            <div className="text-game-yellow text-6xl font-black">
              {room.players.reduce((s, p) => s + p.wordCount, 0)}
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
