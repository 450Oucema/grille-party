import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../socket'
import GameLogo from '../components/GameLogo'

export default function JoinPage() {
  const { roomCode } = useParams<{ roomCode: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [joining, setJoining] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    socket.connect()

    socket.on('player:state', ({ id }: { id: string }) => {
      setPlayerId(id)
      sessionStorage.setItem('playerId', id)
      sessionStorage.setItem('roomCode', roomCode ?? '')
    })

    socket.on('room:state', (room: { phase: string; code: string }) => {
      if (playerId && room.phase === 'playing') {
        navigate(`/room/${room.code}?player=${playerId}`)
      }
      if (playerId && room.phase === 'lobby') {
        // stay on join page showing lobby
      }
    })

    socket.on('error', ({ message }: { message: string }) => {
      setError(message)
      setJoining(false)
    })

    return () => {
      socket.off('player:state')
      socket.off('room:state')
      socket.off('error')
    }
  }, [roomCode, navigate, playerId])

  const join = () => {
    if (!name.trim()) return
    setJoining(true)
    setError('')
    socket.emit('room:join', { roomCode: roomCode?.toUpperCase(), playerName: name.trim() })
  }

  if (playerId) {
    return (
      <div className="game-screen flex flex-col items-center justify-center gap-6 p-6">
        <div className="game-content flex w-full max-w-md flex-col items-center gap-6">
          <GameLogo size="sm" />
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 animate-orbit rounded-full border-4 border-dashed border-game-purple" />
            <div className="avatar-token absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-3xl">A</div>
          </div>
          <div className="cartoon-card w-full p-6 text-center">
            <div className="text-3xl font-black text-game-purple">En attente du lancement...</div>
            <div className="mt-3 text-xl font-extrabold text-game-blue">
              Code : <span className="cartoon-title-sm text-game-yellow">{roomCode}</span>
            </div>
          </div>
          <div className="cartoon-panel w-full p-4">
            <div className="text-sm font-black uppercase text-game-magenta">Astuce</div>
            <div className="mt-1 text-lg font-extrabold text-game-purple">
              Les diagonales comptent. Prépare tes meilleurs chemins.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-screen flex flex-col items-center justify-center gap-6 p-6">
      <div className="game-content flex w-full max-w-sm flex-col items-center gap-6">
        <GameLogo size="sm" />
        <div className="cartoon-card w-full p-5 text-center">
          <div className="text-sm font-black uppercase text-game-purple">Rejoindre la salle</div>
          <div className="cartoon-title-sm mt-1 font-display text-5xl text-game-yellow">{roomCode}</div>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="Ton pseudo…"
          autoFocus
          maxLength={20}
          className="w-full rounded-[24px] border-4 border-game-purple bg-white px-5 py-4
                     text-center text-2xl font-black text-game-purple placeholder-game-purple/45
                     shadow-cartoon outline-none transition-colors focus:bg-game-lilac"
        />

        {error && (
          <div className="status-pill w-full bg-game-red px-4 py-3 text-center text-white">
            {error}
          </div>
        )}

        <button
          onClick={join}
          disabled={joining || !name.trim()}
          className="btn-primary w-full py-4 text-2xl disabled:opacity-50"
        >
          {joining ? '...' : 'Rejoindre'}
        </button>
      </div>
    </div>
  )
}
