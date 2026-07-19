/**
 * KAWACH Command design tokens — uimax dual-hue system.
 * BASE  "paper"  — pure/near white only.
 * ACCENT "amber" — one yellow hue, pastel→ink ramp; severity = darkness.
 * The only non-hue is neutral ink (near-black) for text.
 * No other chromatic color may appear anywhere in the console.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      white: "#FFFFFF",
      paper: {
        DEFAULT: "#FFFFFF",
        warm: "#FEFCF5",
        tint: "#FBF7EA",
      },
      ink: {
        DEFAULT: "#171307",
        soft: "#5C5748",
        faint: "#8F8A7A",
      },
      amber: {
        50: "#FEFAE8",
        100: "#FCF1C4",
        200: "#F8E39A",
        300: "#F2CF5B",
        400: "#E9BA26",
        500: "#C9990F",
        600: "#A37B0B",
        700: "#7C5D09",
        800: "#5C4507",
        900: "#3E2F06",
        950: "#251D04",
      },
    },
    fontFamily: {
      display: ['"Fraunces"', "serif"],
      ui: ['"Archivo"', "sans-serif"],
      mono: ['"Spline Sans Mono"', "monospace"],
    },
    extend: {
      borderRadius: {
        ledger: "2px",
      },
      boxShadow: {
        panel: "0 1px 0 rgba(23,19,7,0.06), 0 14px 34px -22px rgba(62,47,6,0.35)",
        lift: "0 1px 0 rgba(23,19,7,0.08), 0 22px 44px -20px rgba(62,47,6,0.45)",
      },
      letterSpacing: {
        tag: "0.16em",
        wide2: "0.24em",
      },
    },
  },
  plugins: [],
};
