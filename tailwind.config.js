/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"SF Pro"',
          '"San Francisco"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'SFMono-Regular',
          'ui-monospace',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
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
