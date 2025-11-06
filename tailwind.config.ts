import type { Config } from 'tailwindcss';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
      colors: {
        brand: {
          yellow: '#FFD400',
          black: '#0B0B0E'
        }
      },
      boxShadow: {
        glow: '0 0 0 3px rgba(255, 212, 0, 0.2)'
      },
      backgroundImage: {
        'grid-yellow': 'linear-gradient(rgba(255,212,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,212,0,0.06) 1px, transparent 1px)'
      }
    }
  },
  plugins: []
} satisfies Config;


