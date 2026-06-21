import { useRef, useState, useEffect, useCallback } from 'react'
import type { GridCell } from '../types'

type CellPos = { r: number; c: number }

type Props = {
  grid: GridCell[][]
  onSubmit: (word: string) => void
  lastFeedback: { word: string; status: 'accepted' | 'rejected' | 'duplicate'; reason?: string } | null
  disabled?: boolean
}

function isAdjacent(a: CellPos, b: CellPos) {
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && !(a.r === b.r && a.c === b.c)
}

function getWord(path: CellPos[], grid: GridCell[][]): string {
  return path.map(({ r, c }) => grid[r][c].letter).join('')
}

export default function DraggableBoard({ grid, onSubmit, lastFeedback, disabled }: Props) {
  const [path, setPath] = useState<CellPos[]>([])
  const pathRef = useRef<CellPos[]>([])
  const draggingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const size = grid.length

  const getCellFromPoint = (x: number, y: number): CellPos | null => {
    const el = document.elementFromPoint(x, y)
    const cell = el?.closest('[data-row]') as HTMLElement | null
    if (!cell) return null
    const r = parseInt(cell.dataset.row ?? '')
    const c = parseInt(cell.dataset.col ?? '')
    if (isNaN(r) || isNaN(c)) return null
    return { r, c }
  }

  const startDrag = useCallback((r: number, c: number) => {
    if (disabled) return
    const p = [{ r, c }]
    pathRef.current = p
    draggingRef.current = true
    setPath([...p])
  }, [disabled])

  const tryAddCell = useCallback((r: number, c: number) => {
    if (!draggingRef.current) return
    const p = pathRef.current
    const existingIdx = p.findIndex(cell => cell.r === r && cell.c === c)
    if (existingIdx !== -1) {
      // Backtrack: glisser en arrière sur une case déjà sélectionnée tronque le chemin
      if (existingIdx === p.length - 1) return
      const backtracked = p.slice(0, existingIdx + 1)
      pathRef.current = backtracked
      setPath([...backtracked])
      return
    }
    const last = p[p.length - 1]
    if (!last || !isAdjacent(last, { r, c })) return
    const next = [...p, { r, c }]
    pathRef.current = next
    setPath([...next])
  }, [])

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    const word = getWord(pathRef.current, grid)
    pathRef.current = []
    setPath([])
    if (word.replace('QU', 'QU').length >= 3) {
      onSubmit(word)
    }
  }, [grid, onSubmit])

  // Attach non-passive touchmove so we can preventDefault (stops page scroll while dragging)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const touch = e.touches[0]
      const cell = getCellFromPoint(touch.clientX, touch.clientY)
      if (cell) tryAddCell(cell.r, cell.c)
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [tryAddCell])

  // Taille dynamique : la grille prend presque toute la largeur d'écran
  const gapPx = size <= 4 ? 12 : 10
  const sidePad = 16 // px de padding total (8px chaque côté)
  const totalGap = (size - 1) * gapPx
  const cellPx = `calc((100vw - ${sidePad + totalGap}px) / ${size})`
  const fontPx = `calc((100vw - ${sidePad + totalGap}px) / ${size} * ${size <= 4 ? 0.42 : 0.38})`

  const lastCell = path[path.length - 1]
  const word = getWord(path, grid)

  const feedbackColor =
    lastFeedback?.status === 'accepted' ? 'text-green-400' :
    lastFeedback?.status === 'duplicate' ? 'text-gray-400' :
    lastFeedback?.status === 'rejected' ? 'text-red-400' : ''

  const feedbackText =
    lastFeedback?.status === 'accepted' ? `✓ ${lastFeedback.word}` :
    lastFeedback?.status === 'duplicate' ? `= ${lastFeedback.word}` :
    lastFeedback?.status === 'rejected' ? `✗ ${lastFeedback.word}` : ''

  return (
    <div className="w-full flex flex-col items-center gap-3 select-none touch-none" style={{ paddingLeft: sidePad / 2, paddingRight: sidePad / 2 }}>
      {/* Word being formed */}
      <div className="h-12 flex items-center justify-center">
        {path.length > 0 ? (
          <div
            className="font-black text-3xl text-game-yellow tracking-widest"
            style={{ textShadow: '0 0 15px rgba(255,204,0,0.7)' }}
          >
            {word}
          </div>
        ) : lastFeedback ? (
          <div className={`font-black text-xl ${feedbackColor} animate-bounce-in`}>
            {feedbackText}
          </div>
        ) : (
          <div className="text-blue-400 text-sm">Glisse sur les lettres</div>
        )}
      </div>

      {/* Grid */}
      <div
        ref={containerRef}
        className="flex flex-col w-full"
        style={{ gap: gapPx }}
        onMouseLeave={endDrag}
        onMouseUp={endDrag}
        onTouchEnd={endDrag}
        onTouchCancel={endDrag}
      >
        {grid.map((row, r) => (
          <div key={r} className="flex w-full" style={{ gap: gapPx }}>
            {row.map((cell, c) => {
              const inPath = path.some(p => p.r === r && p.c === c)
              const isLast = lastCell?.r === r && lastCell?.c === c
              const pathIndex = path.findIndex(p => p.r === r && p.c === c)
              const canConnect = !inPath && lastCell && isAdjacent(lastCell, { r, c })

              return (
                <div
                  key={c}
                  data-row={r}
                  data-col={c}
                  onMouseDown={() => startDrag(r, c)}
                  onMouseEnter={() => tryAddCell(r, c)}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    startDrag(r, c)
                  }}
                  className={`
                    flex items-center justify-center shrink-0
                    rounded-xl font-black border-4 transition-all duration-75
                    cursor-pointer
                    ${isLast
                      ? 'bg-game-yellow text-game-bg border-yellow-300 scale-110 z-10'
                      : inPath
                      ? 'bg-yellow-600 text-white border-yellow-500 scale-105'
                      : canConnect && path.length > 0
                      ? 'bg-blue-400 text-white border-blue-200'
                      : 'cell-tile'
                    }
                  `}
                  style={{
                    width: cellPx,
                    height: cellPx,
                    fontSize: fontPx,
                    boxShadow: isLast
                      ? '0 0 20px rgba(255,204,0,0.8), inset 0 1px 0 rgba(255,255,255,0.4)'
                      : inPath
                      ? '0 0 10px rgba(255,180,0,0.4)'
                      : undefined,
                    position: 'relative',
                  }}
                >
                  {cell.letter === 'QU'
                    ? <span style={{ fontSize: '0.7em' }}>Qu</span>
                    : cell.letter}

                  {/* Path index bubble */}
                  {inPath && pathIndex >= 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-game-bg
                                 text-[10px] font-black flex items-center justify-center leading-none"
                    >
                      {pathIndex + 1}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Submit hint */}
      {path.length >= 3 && (
        <div className="text-blue-300 text-sm animate-pulse">
          Lâche pour valider
        </div>
      )}
      {path.length > 0 && path.length < 3 && (
        <div className="text-blue-400 text-xs">
          {3 - path.length} lettre{3 - path.length > 1 ? 's' : ''} de plus minimum
        </div>
      )}
    </div>
  )
}
