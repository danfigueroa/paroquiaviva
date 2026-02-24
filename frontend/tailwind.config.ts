import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0f766e',
        surface: '#ffffff',
        ink: '#0f172a'
      }
    }
  },
  plugins: []
} satisfies Config
