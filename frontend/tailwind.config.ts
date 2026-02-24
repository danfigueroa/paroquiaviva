import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d100f',
        panel: '#151a18',
        primary: '#2D4F1E',
        secondary: '#F5E6CC',
        accent: '#E27D60',
        slate: '#4A4A4A',
        ink: '#f7f2e8'
      }
    }
  },
  plugins: []
} satisfies Config
