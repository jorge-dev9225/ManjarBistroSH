import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: '#120a06',
        madera: { DEFAULT: '#24150d', claro: '#321e13', borde: '#4a2e1f' },
        oro: { DEFAULT: '#d9a441', claro: '#e8bd66' },
        crema: '#f3e4c7',
        rojo: { DEFAULT: '#c8102e', claro: '#e0304b' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both' },
    },
  },
  plugins: [],
}
export default config
