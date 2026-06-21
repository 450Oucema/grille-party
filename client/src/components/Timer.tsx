import { useEffect, useState } from 'react'

type Props = {
  endsAt: number
  onExpire?: () => void
}

export default function Timer({ endsAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const tick = () => {
      const r = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setRemaining(r)
      if (r === 0) onExpire?.()
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [endsAt, onExpire])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const isUrgent = remaining <= 30
  const isCritical = remaining <= 10

  return (
    <div
      className={`font-black tabular-nums transition-all ${
        isCritical
          ? 'text-red-400 text-8xl animate-timer-pulse'
          : isUrgent
          ? 'text-orange-400 text-7xl'
          : 'text-game-yellow text-7xl'
      }`}
      style={{
        textShadow: isCritical
          ? '0 0 20px rgba(239,68,68,0.8)'
          : '0 0 20px rgba(255,204,0,0.5)',
      }}
    >
      {mins}:{secs.toString().padStart(2, '0')}
    </div>
  )
}
