import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../socket'
import GameLogo from '../components/GameLogo'
import { sound } from '../audio/sound'

export default function HostPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    socket.connect()

    socket.on('room:created', ({ roomCode, hostToken }: { roomCode: string; hostToken: string }) => {
      sessionStorage.setItem(`hostToken:${roomCode}`, hostToken)
      navigate(`/room/${roomCode}`)
    })

    return () => {
      socket.off('room:created')
    }
  }, [navigate])

  const createRoom = () => {
    void sound.unlock()
    sound.playJoin()
    setLoading(true)
    socket.emit('room:create')
  }

  return (
    <div className="game-screen flex flex-col items-center justify-center gap-8 overflow-y-auto p-4 sm:p-6">
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 28 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border-2 border-game-purple opacity-70"
            style={{
              width: Math.random() * 12 + 6,
              height: Math.random() * 12 + 6,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: ['#FFD94A', '#FF4DB8', '#39E5B7', '#E9D6FF'][i % 4],
              animation: `bounceSoft ${2 + Math.random() * 3}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="game-content flex w-full max-w-5xl flex-col items-center gap-6 py-6 sm:gap-8">
        <GameLogo size="md" />
        <button
          onClick={createRoom}
          disabled={loading}
          className="btn-primary mt-2 w-full max-w-sm px-8 py-4 text-2xl sm:px-16 sm:py-5 sm:text-3xl"
        >
          {loading ? '...' : 'Créer une partie'}
        </button>
      </div>
    </div>
  )
}
