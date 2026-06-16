/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          900: "#0F0F12",
          800: "#16161A",
          700: "#1E1E24",
          600: "#2A2A35",
        },
        lavender: {
          DEFAULT: "#9D8DF1",
          light: "#B8B5FF",
          dark: "#7B6CF6",
        },
        gold: {
          DEFAULT: "#F4D068",
          light: "#FFE79A",
          dark: "#D8B43C",
        },
        crimson: {
          DEFAULT: "#FF4A5A",
          dark: "#C82333",
        }
      }
    },
  },
  plugins: [],
}

