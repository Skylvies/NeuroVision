import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@heroui/**/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neuro: {
          black: "#07090e",
          dark: "#0d1018",
          card: "#131620",
          "card-alt": "#1a1d2a",
          blue: "#3b82f6",
          "blue-hover": "#2563eb",
          purple: "#8b5cf6",
          green: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
        },
      },
      fontFamily: {
        sans:    ["Figtree", "sans-serif"],
        display: ["Syne", "sans-serif"],
        mono:    ['"DM Mono"', "monospace"],
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      defaultTheme: "dark",
      themes: {
        dark: {
          colors: {
            background: "#07090e",
            foreground: "#ECEDEE",
            primary: {
              50: "#eff6ff",
              100: "#dbeafe",
              200: "#bfdbfe",
              300: "#93c5fd",
              400: "#60a5fa",
              500: "#3b82f6",
              600: "#2563eb",
              700: "#1d4ed8",
              800: "#1e40af",
              900: "#1e3a8a",
              DEFAULT: "#3b82f6",
              foreground: "#FFFFFF",
            },
            focus: "#3b82f6",
          },
        },
      },
    }),
  ],
};

export default config;
