type Props = {
  size?: 'sm' | 'md' | 'lg'
  subtitle?: string
}

const sizeClass = {
  sm: 'text-4xl sm:text-5xl',
  md: 'text-6xl sm:text-7xl',
  lg: 'text-7xl sm:text-8xl lg:text-9xl',
}

export default function GameLogo({ size = 'md', subtitle }: Props) {
  return (
    <div className="relative inline-flex flex-col items-center gap-2">
      <div className="confetti absolute -inset-x-8 -top-4 h-14 pointer-events-none">
        <span className="left-2 top-6 h-4 w-8 -rotate-12 bg-game-yellow" />
        <span className="left-12 top-0 h-4 w-8 rotate-45 bg-game-magenta" />
        <span className="right-3 top-4 h-4 w-8 rotate-[-42deg] bg-game-yellow" />
        <span className="right-14 top-9 h-4 w-8 rotate-12 bg-game-mint" />
      </div>
      <div className={`font-display font-extrabold leading-[.82] ${sizeClass[size]} text-center`}>
        <span className="cartoon-title text-white">GRILLE</span>{' '}
        <span className="cartoon-title text-game-yellow">PARTY</span>
      </div>
      {subtitle && (
        <div className="rounded-full border-[3px] border-game-purple bg-white px-5 py-1 text-center text-base font-black text-game-purple shadow-cartoon-sm sm:text-xl">
          {subtitle}
        </div>
      )}
    </div>
  )
}
