/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'game-bg': '#1a0a5e',
        'game-blue': '#2244cc',
        'game-purple': '#6622cc',
        'game-yellow': '#ffcc00',
        'game-green': '#44dd44',
        'game-red': '#ee3333',
        'cell-bg': '#2233aa',
        'cell-border': '#4455ee',
        'cell-text': '#ffffff',
      },
      fontFamily: {
        game: ['Arial Rounded MT Bold', 'Arial', 'sans-serif'],
      },
      animation: {
        'bounce-in': 'bounceIn 0.3s ease-out',
        'score-pop': 'scorePop 0.5s ease-out forwards',
        'pulse-glow': 'pulseGlow 1s ease-in-out infinite',
        'shake': 'shake 0.3s ease-in-out',
        'timer-pulse': 'timerPulse 1s ease-in-out infinite',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '60%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scorePop: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '50%': { transform: 'translateY(-30px) scale(1.3)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) scale(1)', opacity: '0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(255,204,0,0.5)' },
          '50%': { boxShadow: '0 0 25px rgba(255,204,0,1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        timerPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
