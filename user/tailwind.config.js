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
        // KAWACH uimax dual-hue tokens (white base + one amber hue, severity = darkness)
        paper: { DEFAULT: "#FFFFFF", warm: "#FEFCF5" },
        ink: { DEFAULT: "#171307", soft: "#5C5748", faint: "#8F8A7A" },
        amber: {
          50: "#FEFAE8", 100: "#FCF1C4", 200: "#F8E39A", 300: "#F2CF5B",
          400: "#E9BA26", 500: "#C9990F", 600: "#A37B0B", 700: "#7C5D09",
          800: "#5C4507", 900: "#3E2F06", 950: "#251D04",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sora: ['"Sora"', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
        ui: ['"Archivo"', 'sans-serif'],
        mono: ['"Spline Sans Mono"', 'monospace'],
      },
      letterSpacing: {
        tag: "0.16em",
        wide2: "0.24em",
      },
    },
  },
  plugins: [],
}
