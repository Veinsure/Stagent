import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     "#0e0e10",
          surface:  "#18181b",
          elevated: "#1f1f23",
        },
        text: {
          DEFAULT:  "#efeff1",
          primary:  "#efeff1",
          muted:    "#adadb8",
          disabled: "#53535f",
          onAccent: "#ffffff",
        },
        border: {
          DEFAULT: "#303032",
          strong:  "#444448",
        },
        accent: {
          DEFAULT: "#9147ff",
          hover:   "#772ce8",
        },
        live:    "#eb0400",
        online:  "#00f593",
        warn:    "#ffca28",
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
