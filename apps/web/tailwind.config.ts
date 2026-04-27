import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     "var(--bg-base)",
          surface:  "var(--bg-surface)",
          elevated: "var(--bg-elevated)",
        },
        text: {
          DEFAULT:  "var(--text-primary)",
          primary:  "var(--text-primary)",
          muted:    "var(--text-muted)",
          disabled: "var(--text-disabled)",
          onAccent: "var(--text-on-accent)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong:  "var(--border-strong)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover:   "var(--accent-hover)",
        },
        live:    "var(--live)",
        online:  "var(--online)",
        warn:    "var(--warn)",
      },
      animation: {
        "live-pulse": "livePulse 2s ease-in-out infinite",
      },
      keyframes: {
        livePulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
      },
    },
  },
  plugins: [],
}

export default config
