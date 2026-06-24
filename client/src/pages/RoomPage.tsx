import { useEffect, useState, useCallback } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { socket } from '../socket'
import type { PublicPlayer, PublicRoom, PlayerResult, ScoreMode } from '../types'
import AvatarPicker from '../components/AvatarPicker'
import AvatarToken from '../components/AvatarToken'
import QRJoin from '../components/QRJoin'
import Board from '../components/Board'
import DraggableBoard from '../components/DraggableBoard'
import Timer from '../components/Timer'
import PlayerList from '../components/PlayerList'
import ResultsCinematic from '../components/ResultsCinematic'
import GameLogo from '../components/GameLogo'
import SoundToggle from '../components/SoundToggle'
import { sound } from '../audio/sound'

type Feedback = {
  word: string
  status: 'accepted' | 'rejected' | 'duplicate'
  reason?: string
}

function PlayingScoreCards({ players }: { players: PublicPlayer[] }) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="flex flex-col gap-3">
      {sortedPlayers.map((p) => (
        <div
          key={p.id}
          className={`flex items-center justify-between gap-3 rounded-2xl border-[3px] border-game-purple p-3 shadow-cartoon-sm transition-all ${
            p.connected ? '' : 'opacity-60'
          }`}
          style={{ background: p.color }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <AvatarToken avatar={p.avatar} className="h-10 w-10 rounded-xl" />
            <span className="truncate text-base font-black text-game-purple">{p.name}</span>
          </div>
          <span className="font-display text-3xl font-extrabold leading-none text-game-purple">
            {p.score}
          </span>
        </div>
      ))}
    </div>
  )
}

function MobilePlayerWordCounts({ players }: { players: PublicPlayer[] }) {
  const sortedPlayers = [...players].sort((a, b) => b.wordCount - a.wordCount)

  return (
    <div className="mx-3 mb-3 mt-2 flex-1 overflow-auto rounded-[24px] border-4 border-game-purple bg-white/90 px-3 pb-3 pt-3 shadow-cartoon">
      <div className="mb-2 text-xs font-black uppercase text-game-purple">
        Joueurs
      </div>
      <div className="grid grid-cols-1 gap-2">
        {sortedPlayers.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between gap-3 rounded-2xl border-[3px] border-game-purple px-3 py-2 shadow-cartoon-sm ${
              p.connected ? 'bg-white' : 'bg-game-lilac opacity-60'
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <AvatarToken avatar={p.avatar} className="h-10 w-10 rounded-xl" />
              <span className="truncate text-base font-black text-game-purple">{p.name}</span>
            </div>
            <span className="status-pill shrink-0 bg-game-yellow px-3 py-1 text-sm text-game-purple">
              {p.wordCount} mot{p.wordCount > 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const [searchParams] = useSearchParams()
  const hostToken = roomCode ? sessionStorage.getItem(`hostToken:${roomCode}`) : null
  const initialPlayerId =
    searchParams.get('player') ??
    (roomCode ? sessionStorage.getItem(`playerId:${roomCode}`) : null)

  const [playerId, setPlayerId] = useState<string | null>(initialPlayerId)
  const [hostView, setHostView] = useState<'host' | 'player'>('host')
  const [hostPlayerName, setHostPlayerName] = useState('')
  const [hostPlayerAvatar, setHostPlayerAvatar] = useState(0)
  const [room, setRoom] = useState<PublicRoom | null>(null)
  const [results, setResults] = useState<PlayerResult[] | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [soundMuted, setSoundMuted] = useState(sound.isMuted())
  const [roomError, setRoomError] = useState<string | null>(null)
  const [playerSessionLost, setPlayerSessionLost] = useState(false)
  const [hostSessionLost, setHostSessionLost] = useState(false)
  const [socketConnected, setSocketConnected] = useState(socket.connected)

  const isHost = !!hostToken
  const currentPlayer = room?.players.find(p => p.id === playerId)
  const phase = room?.phase ?? 'lobby'
  const isPlayerView = !!playerId && (!isHost || (hostView === 'player' && phase !== 'results'))

  const emitWhenConnected = useCallback((event: string, payload: unknown) => {
    void sound.unlock()
    if (socket.connected) {
      socket.emit(event, payload)
      return
    }
    socket.connect()
    socket.once('connect', () => socket.emit(event, payload))
  }, [])

  useEffect(() => sound.subscribe((state) => setSoundMuted(state.muted)), [])

  useEffect(() => {
    if (phase === 'playing' && room?.endsAt && !soundMuted) {
      sound.startMusic(room.endsAt)
    } else {
      sound.stopMusic()
    }
    return () => sound.stopMusic()
  }, [phase, room?.endsAt, soundMuted])

  useEffect(() => {
    socket.connect()

    socket.on('room:state', (r: PublicRoom) => {
      setRoomError(null)
      setRoom(r)
    })

    socket.on('player:state', ({ id }: { id: string; words: string[] }) => {
      setPlayerSessionLost(false)
      setPlayerId(id)
      if (roomCode) {
        sessionStorage.setItem(`playerId:${roomCode}`, id)
        sessionStorage.setItem('roomCode', roomCode)
      }
      sessionStorage.setItem('playerId', id)
    })

    socket.on('game:started', () => {
      setResults(null)
    })

    socket.on('game:ended', ({ results: r }: { results: PlayerResult[] }) => {
      setResults(r)
    })

    socket.on('word:accepted-local', ({ word }: { word: string }) => {
      setFeedback({ word, status: 'accepted' })
      sound.playAccepted(currentPlayer?.avatar ?? 0)
    })

    socket.on('word:rejected-local', ({ word, reason }: { word: string; reason: string }) => {
      sound.playRejected()
      if (reason === 'deja_envoye') {
        setFeedback({ word, status: 'duplicate', reason })
      } else {
        setFeedback({ word, status: 'rejected', reason })
      }
    })

    socket.on('word:found-public', ({ avatar }: { playerId: string; avatar: number; wordCount: number }) => {
      sound.playOpponentFound(avatar)
    })

    socket.on('error', ({ message }: { message: string }) => {
      if (message === 'Salle introuvable.' || message === 'Salon introuvable.') {
        setRoom(null)
        setResults(null)
        setRoomError('Salon introuvable')
        return
      }
      if (message === 'Session joueur introuvable.') {
        if (roomCode) {
          sessionStorage.removeItem(`playerId:${roomCode}`)
        }
        sessionStorage.removeItem('playerId')
        setPlayerId(null)
        setPlayerSessionLost(true)
        return
      }
      if (message === 'Session hôte introuvable.') {
        if (roomCode) {
          sessionStorage.removeItem(`hostToken:${roomCode}`)
        }
        setHostSessionLost(true)
        return
      }
      console.error(message)
    })

    // Request current room state on (re)connect
    const syncRoom = () => {
      setSocketConnected(socket.connected)
      if (roomCode) {
        socket.emit('room:sync', {
          roomCode,
          playerId: playerId ?? undefined,
          hostToken: hostToken ?? undefined,
        })
      }
    }
    const markDisconnected = () => setSocketConnected(false)
    socket.on('connect', syncRoom)
    socket.on('disconnect', markDisconnected)
    syncRoom()

    return () => {
      socket.off('connect', syncRoom)
      socket.off('disconnect', markDisconnected)
      socket.off('room:state')
      socket.off('player:state')
      socket.off('game:started')
      socket.off('game:ended')
      socket.off('word:accepted-local')
      socket.off('word:rejected-local')
      socket.off('word:found-public')
      socket.off('error')
    }
  }, [roomCode, playerId, hostToken, currentPlayer?.avatar])

  const handleStart = () => {
    sound.playStart()
    emitWhenConnected('room:start', { roomCode, hostToken: hostToken ?? undefined })
  }

  const handleSettings = (gridSize: number, durationSec: number) => {
    sound.playSetting()
    emitWhenConnected('room:settings', {
      roomCode,
      gridSize,
      durationSec,
      scoreMode: room?.scoreMode ?? 'classic',
      hostToken: hostToken ?? undefined,
    })
  }

  const handleScoreMode = (scoreMode: ScoreMode) => {
    sound.playSetting()
    emitWhenConnected('room:settings', {
      roomCode,
      gridSize: room?.gridSize ?? 6,
      durationSec: room?.durationSec ?? 120,
      scoreMode,
      hostToken: hostToken ?? undefined,
    })
  }

  const handleRestart = () => {
    emitWhenConnected('room:restart', { roomCode, hostToken: hostToken ?? undefined })
    setResults(null)
  }

  const handleWordSubmit = useCallback((word: string) => {
    emitWhenConnected('word:submit', { roomCode, playerId, word })
  }, [emitWhenConnected, roomCode, playerId])

  const handleHostJoinAsPlayer = () => {
    const playerName = hostPlayerName.trim()
    if (!roomCode || !playerName) return
    sound.playJoin()
    emitWhenConnected('room:join', { roomCode, playerName, avatar: hostPlayerAvatar })
  }

  const handleAvatarChange = (avatar: number) => {
    if (!roomCode || !playerId) {
      setHostPlayerAvatar(avatar)
      return
    }
    emitWhenConnected('player:avatar', { roomCode, playerId, avatar })
  }

  if (roomError) {
    return (
      <div className="game-screen flex min-h-dvh items-center justify-center p-6">
        <div className="game-content cartoon-card flex w-full max-w-md flex-col items-center gap-5 p-6 text-center">
          <GameLogo size="sm" />
          <div>
            <div className="font-display text-4xl font-black text-game-purple">{roomError}</div>
            <div className="mt-2 text-lg font-extrabold text-game-blue">
              Le salon {roomCode} n'existe plus ou le code est incorrect.
            </div>
          </div>
          <Link to="/" className="btn-primary w-full py-3 text-xl">
            Retour a l'accueil
          </Link>
        </div>
      </div>
    )
  }

  if (playerSessionLost) {
    return (
      <div className="game-screen flex min-h-dvh items-center justify-center p-6">
        <div className="game-content cartoon-card flex w-full max-w-md flex-col items-center gap-5 p-6 text-center">
          <GameLogo size="sm" />
          <div>
            <div className="font-display text-4xl font-black text-game-purple">Session perdue</div>
            <div className="mt-2 text-lg font-extrabold text-game-blue">
              Ton ancienne session joueur n'est plus reconnue dans le salon {roomCode}.
            </div>
          </div>
          <Link to={`/join/${roomCode}`} className="btn-primary w-full py-3 text-xl">
            Rejoindre a nouveau
          </Link>
        </div>
      </div>
    )
  }

  if (hostSessionLost) {
    return (
      <div className="game-screen flex min-h-dvh items-center justify-center p-6">
        <div className="game-content cartoon-card flex w-full max-w-md flex-col items-center gap-5 p-6 text-center">
          <GameLogo size="sm" />
          <div>
            <div className="font-display text-4xl font-black text-game-purple">Session hôte perdue</div>
            <div className="mt-2 text-lg font-extrabold text-game-blue">
              Ce navigateur ne peut plus administrer le salon {roomCode}.
            </div>
          </div>
          <Link to="/" className="btn-primary w-full py-3 text-xl">
            Creer un nouveau salon
          </Link>
        </div>
      </div>
    )
  }

  // ─── MOBILE PLAYER VIEW ───────────────────────────────────────────────────
  if (isPlayerView) {
    if (phase === 'results' && results) {
      return <ResultsCinematic results={results} grid={room?.grid} onDone={handleRestart} hideReplay />
    }

    return (
      <div className="game-screen flex flex-col">
        <SoundToggle className="absolute bottom-3 right-3 z-20 px-2 py-1 text-xs" />
        {!socketConnected && (
          <div className="absolute left-3 top-3 z-30 rounded-full border-[3px] border-game-purple bg-game-yellow px-3 py-1 text-xs font-black text-game-purple shadow-cartoon-sm">
            Reconnexion...
          </div>
        )}
        {/* Header */}
        <div className="game-content flex items-center justify-between gap-2 px-3 py-3">
          <div className="status-pill bg-game-yellow px-3 py-2 text-lg text-game-purple">{roomCode}</div>
          <div className="min-w-0 truncate rounded-full bg-white px-3 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">
            {currentPlayer?.name ?? ''}
          </div>
          {phase === 'playing' && room?.endsAt && (
            <div className="scale-[.62] origin-right">
              <Timer endsAt={room.endsAt} />
            </div>
          )}
        </div>

        {isHost && (
          <div className="game-content px-3 pb-2">
            <button
              onClick={() => {
                sound.playUiClick()
                setHostView('host')
              }}
              className="btn-secondary w-full py-2 text-base"
            >
              Retour au salon
            </button>
          </div>
        )}

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

            <MobilePlayerWordCounts players={room.players} />
          </div>
        )}

        {/* Lobby */}
        {phase === 'lobby' && (
          <div className="game-content flex flex-1 flex-col items-center justify-center gap-6 p-6">
            <GameLogo size="sm" />
            <div className="cartoon-card w-full max-w-sm p-6 text-center">
              <div className="text-2xl font-black text-game-purple">En attente du lancement...</div>
              <div className="mt-2 font-extrabold text-game-blue">
                {isHost ? 'Tu peux revenir au salon pour lancer la partie' : "L'hôte prépare la grille"}
              </div>
              {currentPlayer && (
                <div className="mt-5 text-left">
                  <div className="mb-2 text-xs font-black uppercase text-game-purple">Avatar</div>
                  <AvatarPicker value={currentPlayer.avatar} onChange={handleAvatarChange} compact />
                </div>
              )}
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
    <div className="game-screen flex flex-col lg:h-screen lg:overflow-hidden">
      <SoundToggle className="absolute right-4 top-4 z-20" />
      {!socketConnected && (
        <div className="absolute left-4 top-4 z-30 rounded-full border-[3px] border-game-purple bg-game-yellow px-4 py-2 text-sm font-black text-game-purple shadow-cartoon-sm">
          Reconnexion...
        </div>
      )}
      {/* ── LOBBY ── */}
      {phase === 'lobby' && (
        <div className="game-content flex flex-1 flex-col items-stretch gap-6 overflow-y-auto p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-center lg:gap-10 lg:p-8">
          {/* Left: QR + code */}
          <div className="flex flex-col items-center gap-4 lg:gap-6">
            <GameLogo size="room" />
            {roomCode && <QRJoin roomCode={roomCode} />}
          </div>

          {/* Right: settings + player list + start */}
          <div className="flex w-full flex-col gap-4 sm:gap-5 lg:min-w-[360px] lg:max-w-[440px]">
            {/* Settings */}
            <div className="cartoon-panel flex flex-col gap-4 p-4 sm:p-5">
              <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Paramètres</div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-black uppercase text-game-purple">Taille de grille</div>
                <div className="grid grid-cols-2 gap-2">
                  {[4, 6].map(s => (
                    <button
                      key={s}
                      onClick={() => handleSettings(s, room?.durationSec ?? 120)}
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
                <div className="grid grid-cols-3 gap-2">
                  {[{label:'1 min', s:60},{label:'2 min', s:120}].map(({label, s}) => (
                    <button
                      key={s}
                      onClick={() => handleSettings(room?.gridSize ?? 6, s)}
                      className={`segmented-option flex-1 text-sm ${
                        (room?.durationSec ?? 120) === s
                          ? 'segmented-option-selected text-game-purple'
                          : 'text-game-purple'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="text-sm font-black uppercase text-game-purple">Score</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Classique', mode: 'classic' as const },
                    { label: 'Lettres rares', mode: 'rareLetters' as const },
                  ].map(({ label, mode }) => (
                    <button
                      key={mode}
                      onClick={() => handleScoreMode(mode)}
                      className={`segmented-option flex-1 text-sm ${
                        (room?.scoreMode ?? 'classic') === mode
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

            {isHost && (
              <div className="cartoon-card p-4">
                {currentPlayer ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <AvatarToken avatar={currentPlayer.avatar} className="h-14 w-14" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black uppercase text-game-purple">Tu participes aussi</div>
                        <div className="truncate text-lg font-black text-game-blue">{currentPlayer.name}</div>
                      </div>
                    </div>
                    <AvatarPicker value={currentPlayer.avatar} onChange={handleAvatarChange} compact />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div>
                      <div className="text-sm font-black uppercase text-game-magenta">Depuis cet appareil</div>
                      <div className="text-lg font-black text-game-purple">Je participe aussi</div>
                    </div>
                    <AvatarPicker value={hostPlayerAvatar} onChange={setHostPlayerAvatar} compact />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input
                        value={hostPlayerName}
                        onChange={(e) => setHostPlayerName(e.target.value.slice(0, 20))}
                        onKeyDown={(e) => e.key === 'Enter' && handleHostJoinAsPlayer()}
                        placeholder="Ton pseudo"
                        maxLength={20}
                        className="min-w-0 flex-1 rounded-2xl border-[3px] border-game-purple bg-white px-3 py-3 text-base font-black text-game-purple placeholder-game-purple/45 shadow-cartoon-sm outline-none"
                      />
                      <button
                        onClick={handleHostJoinAsPlayer}
                        disabled={!hostPlayerName.trim()}
                        className="btn-primary px-4 py-3 text-base"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
        <div className="game-content flex flex-1 flex-col gap-4 overflow-y-auto p-4 lg:flex-row lg:gap-6 lg:overflow-hidden lg:p-6">
          {/* Left: player scores */}
          <div className="cartoon-panel flex shrink-0 flex-col gap-4 p-4 lg:w-64">
            <div className="status-pill self-start bg-game-purple px-4 py-1 text-white">Scores</div>
            <PlayingScoreCards players={room.players} />
          </div>

          {/* Center: grid + timer */}
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <Timer endsAt={room.endsAt} />
            <Board grid={room.grid} />
          </div>

          {/* Right: stats */}
          <div className="flex shrink-0 flex-col justify-start gap-4 lg:w-64">
            {isHost && currentPlayer && (
              <button
                onClick={() => {
                  sound.playUiClick()
                  setHostView('player')
                }}
                className="btn-primary text-xl"
              >
                Jouer mes mots
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTS cinematic (host only) ── */}
      {phase === 'results' && results && (
        <ResultsCinematic results={results} grid={room?.grid} onDone={handleRestart} />
      )}
    </div>
  )
}
