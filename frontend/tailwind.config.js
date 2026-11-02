/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory:   '#FAF7F2',
        parchment: '#F0E8D5',
        gold:    '#C9A84C',
        'gold-light': '#E8C96A',
        charcoal: '#2C2C2C',
        muted:   '#6B6B6B',
        border:  '#E8E0D0',
        heritage: {
          50:  '#FAF7F2',
          100: '#F0E8D5',
          200: '#DDD0B8',
          300: '#C9B799',
          400: '#B49B77',
          500: '#9E7E55',
          600: '#7D6341',
          700: '#5C4830',
          800: '#3B2E1E',
          900: '#1A140C',
        },
        accent: {
          gold:    '#C9A84C',
          crimson: '#8B2E2E',
          forest:  '#4A7C59',
          slate:   '#5C6B7A',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'heritage': '0 4px 24px rgba(44, 44, 44, 0.08)',
        'heritage-lg': '0 8px 40px rgba(44, 44, 44, 0.12)',
        'gold': '0 0 0 2px rgba(201, 168, 76, 0.3)',
      },
      backgroundImage: {
        'heritage-gradient': 'linear-gradient(135deg, #FAF7F2 0%, #F0E8D5 50%, #DDD0B8 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1A140C 0%, #2C2C2C 100%)',
        'gold-gradient': 'linear-gradient(135deg, #C9A84C 0%, #E8C96A 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGold: { '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(201,168,76,0)' } },
      },
    },
  },
  plugins: [],
}
