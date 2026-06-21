import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { socket } from '../socket'

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
      <div
        className="w-screen h-screen flex flex-col items-center justify-center gap-6 p-6"
        style={{ background: 'radial-gradient(ellipse, #1e3a8a 0%, #1a0a5e 100%)' }}
      >
        <div className="text-6xl animate-bounce">⏳</div>
        <div className="text-3xl font-black text-game-yellow text-center">En attente du lancement…</div>
        <div className="text-blue-300 text-xl text-center">
          Code de salle : <span className="text-white font-black tracking-widest">{roomCode}</span>
        </div>
        <div className="text-blue-400 text-lg text-center">
          L'hôte va lancer la partie depuis l'écran principal
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center gap-6 p-6"
      style={{ background: 'radial-gradient(ellipse, #1e3a8a 0%, #1a0a5e 100%)' }}
    >
      <div
        className="text-5xl font-black text-game-yellow text-center"
        style={{ textShadow: '0 0 20px rgba(255,204,0,0.5)' }}
      >
        GRILLE PARTY
      </div>
      <div className="text-blue-300 text-xl text-center">
        Rejoindre la salle{' '}
        <span className="text-white font-black tracking-widest">{roomCode}</span>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="Ton pseudo…"
          autoFocus
          maxLength={20}
          className="bg-game-blue border-4 border-blue-500 rounded-2xl px-5 py-4
                     text-white text-2xl font-black placeholder-blue-400 outline-none
                     focus:border-game-yellow transition-colors w-full text-center"
        />

        {error && (
          <div className="bg-red-600 rounded-2xl px-4 py-3 text-center font-bold">
            {error}
          </div>
        )}

        <button
          onClick={join}
          disabled={joining || !name.trim()}
          className="btn-primary text-2xl py-4 disabled:opacity-50"
        >
          {joining ? '...' : '🎮 Rejoindre'}
        </button>
      </div>
    </div>
  )
}
