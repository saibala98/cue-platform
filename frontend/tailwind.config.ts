import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#39FF14',
          pink: '#FF006E',
          yellow: '#FFE600',
          black: '#0A0A0A',
          dark: '#1A1A1A',
          surface: '#111111',
          border: '#2A2A2A',
          muted: '#AAAAAA',
          faint: '#555555',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'neon-green': '0 0 5px #39FF14, 0 0 10px #39FF14, 0 0 20px rgba(57,255,20,0.3)',
        'neon-pink': '0 0 5px #FF006E, 0 0 10px #FF006E, 0 0 20px rgba(255,0,110,0.3)',
        'neon-green-soft': '0 0 8px rgba(57,255,20,0.3)',
        'neon-pink-soft': '0 0 8px rgba(255,0,110,0.3)',
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(#1A1A1A 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '30px 30px',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
