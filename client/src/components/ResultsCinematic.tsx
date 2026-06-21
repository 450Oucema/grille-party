import { useEffect, useState, useRef } from 'react'
import type { PlayerResult } from '../types'
import { AVATARS } from '../types'

type Props = {
  results: PlayerResult[]
  onDone: () => void
  hideReplay?: boolean
}

type RevealWord = {
  word: string
  score: number
  players: string[]
}

type Phase = 'buzzer' | 'words' | 'scores' | 'podium'

function buildRevealList(results: PlayerResult[]): RevealWord[] {
  const seen = new Map<string, { score: number; players: string[] }>()
  for (const r of results) {
    for (const w of r.words) {
      const key = w.word
      if (!seen.has(key)) {
        seen.set(key, { score: w.score, players: [] })
      }
      seen.get(key)!.players.push(r.playerName)
    }
  }
  const list: RevealWord[] = []
  for (const [word, { score, players }] of seen) {
    const isDuplicate = score === 0 && players.length > 1
    if (!isDuplicate) {
      list.push({ word, score, players })
    }
  }
  return list.sort((a, b) => b.score - a.score)
}

function AnimatedScore({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0)
  const start = useRef(Date.now())
  useEffect(() => {
    start.current = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start.current
      const progress = Math.min(elapsed / duration, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <>{val}</>
}

const MEDALS = ['🥇', '🥈', '🥉']

export default function ResultsCinematic({ results, onDone, hideReplay }: Props) {
  const [phase, setPhase] = useState<Phase>('buzzer')
  const [revealIdx, setRevealIdx] = useState(-1)
  const [showScores, setShowScores] = useState(false)

  const revealList = buildRevealList(results)
  const currentWord = revealList[revealIdx] ?? null

  // Phase machine
  useEffect(() => {
    if (phase === 'buzzer') {
      const t = setTimeout(() => setPhase('words'), 1800)
      return () => clearTimeout(t)
    }
    if (phase === 'words') {
      // Reveal words one by one
      let i = 0
      const next = () => {
        setRevealIdx(i)
        i++
        if (i < revealList.length) {
          timer = setTimeout(next, 800)
        } else {
          timer = setTimeout(() => setPhase('scores'), 800)
        }
      }
      let timer = setTimeout(next, 300)
      return () => clearTimeout(timer)
    }
    if (phase === 'scores') {
      const t = setTimeout(() => {
        setShowScores(true)
        setTimeout(() => setPhase('podium'), 2200)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [phase, revealList.length])

  return (
    <div
      className="w-screen h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #1e3a8a 0%, #1a0a5e 60%, #0a0030 100%)',
      }}
    >
      {/* ── BUZZER ── */}
      {phase === 'buzzer' && (
        <div className="flex flex-col items-center gap-6 animate-bounce-in">
          <div
            className="text-[120px] leading-none"
            style={{ filter: 'drop-shadow(0 0 30px rgba(255,50,50,0.8))' }}
          >
            ⏰
          </div>
          <div
            className="text-7xl font-black text-red-400 text-center"
            style={{ textShadow: '0 0 40px rgba(255,50,50,0.9)' }}
          >
            TEMPS ÉCOULÉ !
          </div>
        </div>
      )}

      {/* ── WORD REVEAL ── */}
      {phase === 'words' && (
        <div className="flex flex-col items-center gap-8 w-full max-w-3xl px-8">
          <div className="text-2xl font-black text-blue-300 uppercase tracking-widest">
            Comparaison des mots
          </div>

          {/* Current word flash */}
          <div className="h-32 flex items-center justify-center">
            {currentWord && (
              <div
                key={currentWord.word}
                className="flex flex-col items-center gap-2 animate-bounce-in"
              >
                <div
                  className="text-6xl font-black tracking-widest text-game-yellow"
                  style={{ textShadow: '0 0 30px rgba(255,204,0,0.8)' }}
                >
                  {currentWord.word}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-2xl font-black">
                    +{currentWord.score} pts
                  </span>
                  <span className="text-blue-300 text-lg">
                    · {currentWord.players[0]}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Word log (last few) */}
          <div className="flex flex-wrap gap-2 justify-center max-h-32 overflow-hidden">
            {revealList.slice(0, revealIdx).reverse().slice(0, 20).map((w, i) => (
              <span
                key={w.word}
                className="px-3 py-1 rounded-full text-sm font-bold bg-green-700 text-white"
                style={{ opacity: Math.max(0.3, 1 - i * 0.08) }}
              >
                +{w.score} {w.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── SCORES ── */}
      {phase === 'scores' && showScores && (
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl px-8 animate-bounce-in">
          <div className="text-3xl font-black text-game-yellow uppercase tracking-widest">
            Scores
          </div>
          <div className="w-full flex flex-col gap-3">
            {results.map((r, i) => (
              <div
                key={r.playerId}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-500 bg-game-blue"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="text-3xl">{AVATARS[r.avatar % AVATARS.length]}</div>
                <div className="flex-1 font-black text-xl">{r.playerName}</div>
                <div className="text-blue-300 text-sm">{r.wordCount} mots</div>
                <div
                  className="font-black text-4xl text-game-yellow"
                  style={{ textShadow: '0 0 10px rgba(255,204,0,0.6)', minWidth: '3rem', textAlign: 'right' }}
                >
                  <AnimatedScore target={r.totalScore} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PODIUM ── */}
      {phase === 'podium' && (
        <div className="flex flex-col items-center gap-8 w-full px-8 animate-bounce-in">
          <div
            className="text-5xl font-black text-game-yellow"
            style={{ textShadow: '0 0 30px rgba(255,204,0,0.7)' }}
          >
            🏆 Classement final
          </div>

          <div className="w-full max-w-2xl flex flex-col gap-3">
            {results.map((r, i) => (
              <div
                key={r.playerId}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${
                  i === 0
                    ? 'border-game-yellow bg-game-yellow/20 scale-105'
                    : 'border-blue-600 bg-game-blue'
                }`}
              >
                <div className="text-4xl w-12 text-center">{MEDALS[i] ?? `${i + 1}`}</div>
                <div className="text-3xl">{AVATARS[r.avatar % AVATARS.length]}</div>
                <div className="flex-1">
                  <div className="font-black text-2xl">{r.playerName}</div>
                  <div className="text-blue-300 text-sm">
                    {r.wordCount} mots valides
                    {r.bestWord && <> · meilleur : <span className="text-game-yellow font-bold">{r.bestWord}</span></>}
                  </div>
                </div>
                <div
                  className={`font-black text-5xl ${i === 0 ? 'text-game-yellow' : 'text-white'}`}
                  style={i === 0 ? { textShadow: '0 0 20px rgba(255,204,0,0.8)' } : {}}
                >
                  {r.totalScore}
                </div>
              </div>
            ))}
          </div>

          {!hideReplay && (
            <button
              onClick={onDone}
              className="btn-primary text-2xl mt-2"
            >
              🔄 Rejouer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
