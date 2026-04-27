"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "dark"
  const attr = document.documentElement.getAttribute("data-theme") as Theme | null
  return attr ?? "dark"
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setTheme(readInitialTheme())
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", next)
    try { localStorage.setItem("stg_theme", next) } catch {}
    setTheme(next)
  }

  if (!mounted) {
    return <button className="w-8 h-8 flex items-center justify-center text-text-muted" aria-hidden />
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "切换为浅色" : "切换为深色"}
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition"
    >
      {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  )
}
