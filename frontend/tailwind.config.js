/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Baccarat theme colors
        banker: {
          DEFAULT: '#dc2626',
          light: '#ef4444',
          dark: '#b91c1c',
        },
        player: {
          DEFAULT: '#2563eb',
          light: '#3b82f6',
          dark: '#1d4ed8',
        },
        tie: {
          DEFAULT: '#16a34a',
          light: '#22c55e',
          dark: '#15803d',
        },
        gold: {
          DEFAULT: '#fbbf24',
          light: '#fcd34d',
          dark: '#f59e0b',
        },
        // Dark theme
        dark: {
          100: '#1e293b',
          200: '#1a1a2e',
          300: '#16213e',
          400: '#0f172a',
          500: '#0a0f1c',
        },
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(251, 191, 36, 0.4)' },
          '50%': { boxShadow: '0 0 20px 10px rgba(251, 191, 36, 0.2)' },
        },
      },
    },
  },
  plugins: [],
}
