import { useEffect, useState } from 'react'
import type { CellPos, GridCell, PlayerResult } from '../types'
import AvatarToken from './AvatarToken'

type Props = {
  results: PlayerResult[]
  grid?: GridCell[][]
  onDone: () => void
  hideReplay?: boolean
}

type RevealWord = {
  word: string
  score: number        // score individuel (wordScore, sans bonus)
  bonus: number        // 1 si unique, 0 si partagé
  path: CellPos[]
  players: { id: string; name: string; avatar: number; color: string }[]
  isShared: boolean
}

type Phase = 'buzzer' | 'words' | 'podium'

function buildRevealList(results: PlayerResult[]): RevealWord[] {
  const seen = new Map<string, { score: number; path: CellPos[]; players: RevealWord['players'] }>()
  for (const r of results) {
    for (const w of r.words) {
      if (!w.validDictionary || !w.validPath) continue
      if (!seen.has(w.word)) seen.set(w.word, { score: w.score, path: w.path, players: [] })
      seen.get(w.word)!.players.push({
        id: r.playerId,
        name: r.playerName,
        avatar: r.avatar,
        color: r.color,
      })
    }
  }
  const list: RevealWord[] = []
  for (const [word, { score, path, players }] of seen) {
    const isShared = players.length > 1
    // score du serveur inclut déjà le bonus ; pour l'affichage on recalcule
    const bonus = isShared ? 0 : 1
    const baseScore = score - bonus
    list.push({ word, score: baseScore, bonus, path, players, isShared })
  }
  return list.sort((a, b) => (b.score + b.bonus) - (a.score + a.bonus))
}

const MEDALS = ['🥇', '🥈', '🥉']

function pathKey(pos: CellPos): string {
  return `${pos.r},${pos.c}`
}

function RevealGrid({ grid, active }: { grid: GridCell[][]; active?: RevealWord }) {
  const activePath = new Map(active?.path.map((pos, index) => [pathKey(pos), index]) ?? [])
  const activeColor = active?.players[0]?.color ?? '#FFD94A'
  const size = grid.length

  return (
    <div className="w-full max-w-[min(78vw,520px)]">
      <div
        className="grid rounded-[24px] border-4 border-game-purple bg-white/85 p-2 shadow-cartoon sm:p-3"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: size > 4 ? 6 : 9 }}
      >
        {grid.flatMap((row) =>
          row.map((cell) => {
            const index = activePath.get(`${cell.row},${cell.col}`)
            const isActive = index !== undefined
            return (
              <div
                key={`${cell.row}-${cell.col}`}
                className="relative grid aspect-square place-items-center rounded-xl border-[3px] font-display text-[clamp(1.35rem,7vw,3.1rem)] font-extrabold text-white transition-all duration-200"
                style={{
                  background: isActive
                    ? `linear-gradient(180deg, ${activeColor} 0%, ${activeColor}CC 100%)`
                    : 'linear-gradient(180deg, #895DFF 0%, #6138D8 100%)',
                  borderColor: '#28104B',
                  boxShadow: isActive
                    ? `0 5px 0 #17012E, 0 0 0 4px ${activeColor}66, inset 0 3px 0 rgba(255,255,255,.45)`
                    : '0 5px 0 #17012E, inset 0 -7px 0 rgba(23,1,46,.22), inset 0 3px 0 rgba(255,255,255,.45)',
                  transform: isActive ? 'scale(1.06)' : undefined,
                  zIndex: isActive ? 2 : 1,
                }}
              >
                {cell.letter === 'QU' ? <span className="text-[0.68em]">Qu</span> : cell.letter}
                {isActive && (
                  <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border-2 border-game-purple bg-white text-[10px] font-black leading-none text-game-purple">
                    {index + 1}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function ResultsCinematic({ results, grid, onDone, hideReplay }: Props) {
  const [phase, setPhase] = useState<Phase>('buzzer')
  const [revealIdx, setRevealIdx] = useState(-1)
  const [allRevealed, setAllRevealed] = useState(false)

  const revealList = buildRevealList(results)
  const activeReveal = revealIdx >= 0 ? revealList[revealIdx] : undefined
  const revealedWords = revealList.slice(0, revealIdx + 1).slice(-5)

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
          timer = setTimeout(next, 1250)
        } else {
          setAllRevealed(true)
        }
      }
      timer = setTimeout(next, 300)
      return () => clearTimeout(timer)
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

      {/* ── WORD REVEAL ── grille + chemin ── */}
      {phase === 'words' && (
        <div className="game-content flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden px-4 py-5 sm:px-6">
          <div className="status-pill mx-auto shrink-0 bg-game-purple px-6 py-2 text-xl text-white">
            Comparaison des mots
          </div>

          {grid && <RevealGrid grid={grid} active={activeReveal} />}

          <div className="flex min-h-[118px] w-full max-w-2xl flex-col items-center justify-center gap-3">
            {activeReveal ? (
              <div
                className="flex max-w-full animate-bounce-in items-center gap-3 rounded-[24px] border-4 border-game-purple px-4 py-3 shadow-cartoon"
                style={{ background: activeReveal.players[0]?.color ?? '#FFD94A' }}
              >
                <div className="flex -space-x-2">
                  {activeReveal.players.map((p) => (
                    <AvatarToken key={p.id} avatar={p.avatar} className="h-11 w-11" />
                  ))}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-display text-3xl font-extrabold leading-none text-game-purple">
                    {activeReveal.word}
                  </div>
                  <div className="mt-1 truncate text-sm font-black text-game-purple">
                    {activeReveal.players.map(p => p.name).join(' + ')} · +{activeReveal.score}{activeReveal.bonus > 0 ? ` +${activeReveal.bonus}` : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div className="status-pill bg-white px-5 py-2 text-sm text-game-purple">
                Préparation des chemins...
              </div>
            )}

            <div className="flex max-w-full flex-wrap justify-center gap-2">
              {revealedWords.map((w) => (
                <span
                  key={w.word}
                  className="rounded-full border-2 border-game-purple px-3 py-1 text-xs font-black text-game-purple shadow-cartoon-sm"
                  style={{ background: w.players[0]?.color ?? '#FFD94A' }}
                >
                  {w.word}
                </span>
              ))}
            </div>
          </div>

          {/* Bouton continuer — apparaît quand tout est révélé */}
          {allRevealed && (
            <button
              onClick={() => setPhase('podium')}
              className="btn-primary self-center shrink-0 animate-bounce-in"
            >
              Voir le classement
            </button>
          )}
        </div>
      )}

      {/* ── PODIUM ── */}
      {phase === 'podium' && (
        <div className="game-content flex h-full w-full animate-bounce-in flex-col items-center justify-center gap-6 overflow-y-auto px-5 py-8 sm:px-8">
          <div className="cartoon-title w-full text-center text-[clamp(3rem,12vw,5.8rem)] text-game-yellow">
            Classement final
          </div>

          <div className="flex w-full max-w-3xl flex-col gap-3">
            {results.map((r, i) => (
              <div
                key={r.playerId}
                className={`grid grid-cols-[2.25rem_3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border-4 border-game-purple px-3 py-3 shadow-cartoon sm:grid-cols-[3rem_4rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-4 ${
                  i === 0
                    ? 'bg-game-yellow scale-105'
                    : i === 1
                    ? 'bg-game-lilac'
                    : 'bg-white'
                }`}
              >
                <div className="text-center text-2xl sm:text-4xl">{MEDALS[i] ?? `${i + 1}`}</div>
                <AvatarToken avatar={r.avatar} className="h-12 w-12 sm:h-14 sm:w-14" />
                <div className="min-w-0">
                  <div className="truncate text-xl font-black leading-tight text-game-purple sm:text-2xl">{r.playerName}</div>
                  <div className="text-sm font-extrabold leading-snug text-game-blue sm:text-base">
                    {r.wordCount} mots valides
                    {r.bestWord && (
                      <>
                        <span className="hidden sm:inline"> · </span>
                        <span className="block sm:inline">meilleur : <span className="font-black text-game-purple">{r.bestWord}</span></span>
                      </>
                    )}
                  </div>
                </div>
                <div className="min-w-[3.5rem] text-right font-display text-[clamp(2.7rem,13vw,4.4rem)] font-extrabold leading-none text-game-magenta sm:min-w-[5rem]">
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
