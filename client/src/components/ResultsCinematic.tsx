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
  score: number        // score individuel (wordScore, sans bonus)
  bonus: number        // 1 si unique, 0 si partagé
  players: string[]
  isShared: boolean
}

type Phase = 'buzzer' | 'words' | 'scores' | 'podium'

function buildRevealList(results: PlayerResult[]): RevealWord[] {
  const seen = new Map<string, { score: number; players: string[] }>()
  for (const r of results) {
    for (const w of r.words) {
      if (!w.validDictionary || !w.validPath) continue
      if (!seen.has(w.word)) seen.set(w.word, { score: w.score, players: [] })
      seen.get(w.word)!.players.push(r.playerName)
    }
  }
  const list: RevealWord[] = []
  for (const [word, { score, players }] of seen) {
    const isShared = players.length > 1
    // score du serveur inclut déjà le bonus ; pour l'affichage on recalcule
    const bonus = isShared ? 0 : 1
    const baseScore = score - bonus
    list.push({ word, score: baseScore, bonus, players, isShared })
  }
  return list.sort((a, b) => (b.score + b.bonus) - (a.score + a.bonus))
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
  const [allRevealed, setAllRevealed] = useState(false)
  const [showScores, setShowScores] = useState(false)

  const revealList = buildRevealList(results)

  // Phase machine
  useEffect(() => {
    if (phase === 'buzzer') {
      const t = setTimeout(() => setPhase('words'), 1800)
      return () => clearTimeout(t)
    }
    if (phase === 'words') {
      setRevealIdx(-1)
      setAllRevealed(false)
      if (revealList.length === 0) {
        setAllRevealed(true)
        return
      }
      let i = 0
      let timer: ReturnType<typeof setTimeout>
      const next = () => {
        setRevealIdx(i)
        i++
        if (i < revealList.length) {
          timer = setTimeout(next, 600)
        } else {
          setAllRevealed(true)
        }
      }
      timer = setTimeout(next, 300)
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
    <div className="game-screen flex flex-col items-center justify-center overflow-hidden">
      {/* ── BUZZER ── */}
      {phase === 'buzzer' && (
        <div className="game-content flex flex-col items-center gap-7 animate-bounce-in">
          <div className="grid h-44 w-44 place-items-center rounded-full border-4 border-game-purple bg-game-red shadow-cartoon-lg">
            <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-game-purple bg-game-yellow font-display text-6xl font-extrabold text-game-purple shadow-cartoon-sm">
              !
            </div>
          </div>
          <div className="cartoon-title text-center text-7xl text-game-red">
            Fin de la partie !
          </div>
        </div>
      )}

      {/* ── WORD REVEAL ── colonnes par joueur ── */}
      {phase === 'words' && (
        <div className="game-content flex h-full w-full flex-col gap-4 overflow-hidden px-6 py-5">
          <div className="status-pill mx-auto shrink-0 bg-game-purple px-6 py-2 text-xl text-white">
            Comparaison des mots
          </div>

          {/* Colonnes joueurs */}
          <div
            className="flex-1 grid gap-3 overflow-hidden min-h-0"
            style={{ gridTemplateColumns: `repeat(${results.length}, 1fr)` }}
          >
            {results.map((r) => {
              const revealed = revealList.slice(0, revealIdx + 1)
              const playerWords = revealed.filter(w => w.players.includes(r.playerName))
              const currentReveal = revealList[revealIdx]
              const isActive = currentReveal && currentReveal.players.includes(r.playerName)

              return (
                <div key={r.playerId} className="flex flex-col gap-2 min-w-0 min-h-0">
                  {/* En-tête joueur */}
                  <div className={`shrink-0 rounded-2xl border-[3px] px-2 py-2 text-center shadow-cartoon-sm transition-all duration-200 ${
                    isActive
                      ? 'border-game-purple bg-game-yellow scale-105'
                      : 'border-game-purple bg-white'
                  }`}>
                    <div className="text-xl leading-none">{AVATARS[r.avatar % AVATARS.length]}</div>
                    <div className="mt-0.5 truncate text-xs font-black text-game-purple">{r.playerName}</div>
                  </div>

                  {/* Liste des mots révélés */}
                  <div className="flex flex-col gap-1 overflow-y-auto flex-1">
                    {playerWords.map((w, i) => (
                      <div
                        key={w.word}
                        className={`rounded-full border-2 border-game-purple px-2 py-1.5 text-center text-xs font-black shadow-cartoon-sm ${
                          i === playerWords.length - 1 ? 'animate-bounce-in' : ''
                        } ${
                          w.isShared
                            ? 'bg-game-orange text-game-purple'
                            : 'bg-game-green text-game-purple'
                        }`}
                      >
                        <span>{w.word}</span>
                        <span className="ml-1 text-[10px] opacity-70">
                          +{w.score}{w.bonus > 0 ? <span className="text-game-yellow">+{w.bonus}</span> : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Légende */}
          <div className="cartoon-panel mx-auto flex shrink-0 justify-center gap-4 px-5 py-3 text-xs font-black text-game-purple">
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-game-green border border-game-purple" /> Mot unique (+1 bonus)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded bg-game-orange border border-game-purple" /> Trouvé par plusieurs
            </span>
          </div>

          {/* Bouton continuer — apparaît quand tout est révélé */}
          {allRevealed && (
            <button
              onClick={() => setPhase('scores')}
              className="btn-primary self-center shrink-0 animate-bounce-in"
            >
              Voir les scores →
            </button>
          )}
        </div>
      )}

      {/* ── SCORES ── */}
      {phase === 'scores' && showScores && (
        <div className="game-content flex w-full max-w-3xl animate-bounce-in flex-col items-center gap-6 px-8">
          <div className="cartoon-title-sm font-display text-5xl text-game-yellow">
            Scores
          </div>
          <div className="w-full flex flex-col gap-3">
            {results.map((r, i) => (
              <div
                key={r.playerId}
                className="cartoon-card flex items-center gap-4 p-4"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="avatar-token h-14 w-14 text-3xl">{AVATARS[r.avatar % AVATARS.length]}</div>
                <div className="flex-1 text-xl font-black text-game-purple">{r.playerName}</div>
                <div className="status-pill bg-game-lilac px-3 py-1 text-sm text-game-purple">{r.wordCount} mots</div>
                <div className="min-w-16 text-right font-display text-5xl font-extrabold text-game-magenta">
                  <AnimatedScore target={r.totalScore} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PODIUM ── */}
      {phase === 'podium' && (
        <div className="game-content flex w-full animate-bounce-in flex-col items-center gap-8 px-8">
          <div className="cartoon-title text-6xl text-game-yellow">
            Classement final
          </div>

          <div className="flex w-full max-w-3xl flex-col gap-3">
            {results.map((r, i) => (
              <div
                key={r.playerId}
                className={`flex items-center gap-4 rounded-[26px] border-4 border-game-purple p-4 shadow-cartoon ${
                  i === 0
                    ? 'bg-game-yellow scale-105'
                    : i === 1
                    ? 'bg-game-lilac'
                    : 'bg-white'
                }`}
              >
                <div className="w-12 text-center text-4xl">{MEDALS[i] ?? `${i + 1}`}</div>
                <div className="avatar-token h-14 w-14 text-3xl">{AVATARS[r.avatar % AVATARS.length]}</div>
                <div className="flex-1">
                  <div className="text-2xl font-black text-game-purple">{r.playerName}</div>
                  <div className="text-sm font-extrabold text-game-blue">
                    {r.wordCount} mots valides
                    {r.bestWord && <> · meilleur : <span className="text-game-yellow font-bold">{r.bestWord}</span></>}
                  </div>
                </div>
                <div className="font-display text-6xl font-extrabold text-game-magenta">
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
              Rejouer
            </button>
          )}
        </div>
      )}
    </div>
  )
}
