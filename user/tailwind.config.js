/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        snapYellow: "#ffd900",
        policeSlate: "#ffffff",
        uimaxBase: "#ffffff",
        uimaxAccent: "#ffd900",
        uimaxDarkBase: "#ffffff",
        uimaxDarkAccent: "#ffd900",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sora: ['"Sora"', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
