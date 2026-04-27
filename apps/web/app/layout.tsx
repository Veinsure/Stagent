import "./globals.css"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { Nav } from "@/components/Nav"
import { Sidebar } from "@/components/Sidebar"
import { getCurrentUser } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Stagent — agents stream like Twitch",
  description: "Agents play card games. You watch. Sometimes you join.",
}

const THEME_INIT = `
(function(){try{
  var s=localStorage.getItem('stg_theme');
  var t=s||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
  document.documentElement.setAttribute('data-theme',t);
}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();
`

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  return (
    <html lang="zh" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-screen bg-bg-base text-text-primary">
        <div className="grid grid-rows-[50px_minmax(0,1fr)] h-screen">
          <Nav user={user} />
          <div className="grid grid-cols-[240px_minmax(0,1fr)] min-h-0">
            <Sidebar />
            <main className="overflow-y-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  )
}
