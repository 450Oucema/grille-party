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
      className={`status-pill inline-flex min-w-[8rem] items-center justify-center px-5 py-2 font-display text-5xl font-extrabold tabular-nums transition-all ${
        isCritical
          ? 'bg-game-red text-white animate-timer-pulse'
          : isUrgent
          ? 'bg-game-orange text-game-purple'
          : 'bg-game-yellow text-game-purple'
      }`}
    >
      {mins}:{secs.toString().padStart(2, '0')}
    </div>
  )
}
