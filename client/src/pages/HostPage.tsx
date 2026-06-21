import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../socket'

export default function HostPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    socket.connect()

    socket.on('room:created', ({ roomCode }: { roomCode: string }) => {
      navigate(`/room/${roomCode}`)
    })

    return () => {
      socket.off('room:created')
    }
  }, [navigate])

  const createRoom = () => {
    setLoading(true)
    socket.emit('room:create')
  }

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center gap-10"
      style={{
        background: 'radial-gradient(ellipse at center, #1e3a8a 0%, #1a0a5e 60%, #0a0030 100%)',
      }}
    >
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-60"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `pulse ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative flex flex-col items-center gap-6">
        {/* Title */}
        <div
          className="text-8xl font-black text-center"
          style={{
            background: 'linear-gradient(180deg, #ffdd44 0%, #ff8800 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
            filter: 'drop-shadow(0 4px 8px rgba(255,150,0,0.5))',
          }}
        >
          GRILLE
        </div>
        <div
          className="text-8xl font-black text-center -mt-8"
          style={{
            background: 'linear-gradient(180deg, #44aaff 0%, #0044ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 4px 8px rgba(0,100,255,0.5))',
          }}
        >
          PARTY
        </div>

        {/* Subtitle */}
        <div className="text-blue-300 text-xl font-bold text-center">
          Le jeu de mots pour toute la famille !
        </div>

        {/* Grid preview decoration */}
        <div className="flex gap-2 my-2">
          {['G', 'R', 'I', 'L', 'L', 'E'].map((l, i) => (
            <div key={i} className="cell-tile w-14 h-14 text-2xl">{l}</div>
          ))}
        </div>

        <button
          onClick={createRoom}
          disabled={loading}
          className="btn-primary text-3xl py-5 px-16 mt-4"
        >
          {loading ? '...' : '🎮 Créer une partie'}
        </button>
      </div>
    </div>
  )
}
