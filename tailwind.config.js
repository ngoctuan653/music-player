/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chassis: 'var(--chassis)',
        panel: 'var(--panel)',
        'panel-hover': 'var(--panel-hover)',
        'panel-active': 'var(--panel-active)',
        hairline: 'var(--hairline)',
        'hairline-active': 'var(--hairline-active)',
        tally: 'var(--tally-red)',
        'legend-silver': 'var(--legend-silver)',
        'legend-muted': 'var(--legend-muted)',
        'legend-subtle': 'var(--legend-subtle)',
      },
    },
  },
  plugins: [],
}
