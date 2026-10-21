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
        yt: {
          bg: '#0f0f0f',
          surface: '#1e1e1e',
          card: '#272727',
          hover: '#383838',
          border: '#3f3f3f',
          red: '#ff0000',
          accent: '#ff4e45',
          text: '#f1f1f1',
          muted: '#aaaaaa'
        }
      }
    },
  },
  plugins: [],
}

