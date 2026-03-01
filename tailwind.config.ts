import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      colors: {
        burgundy: {
          DEFAULT: "#722F37",
          light: "#8B3A42",
          dark: "#5C262D",
        },
        accent: {
          DEFAULT: "#c9a227",
          hover: "#b8921f",
          muted: "rgba(201, 162, 39, 0.12)",
        },
        surface: {
          DEFAULT: "#fafaf9",
          card: "#ffffff",
          border: "#e7e5e4",
        },
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)",
        cardHover: "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
        soft: "0 2px 8px -2px rgb(0 0 0 / 0.08), 0 4px 16px -4px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};
export default config;
