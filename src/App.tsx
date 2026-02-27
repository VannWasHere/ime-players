import { useEffect, useState } from "react"
import ServerDashboard from "@/components/ServerDashboard"

// ─── Server configs ──────────────────────────────────────────────────
const SERVERS = [
  {
    id: "ime",
    label: "iMe",
    apiUrl: "https://frontend.cfx-services.net/api/servers/single/zrvmg4",
    showGho: true,
    showLawEnforcement: true,
  },
  {
    id: "indopride",
    label: "Indopride",
    apiUrl: "https://frontend.cfx-services.net/api/servers/single/bak4pl",
    showGho: true,
    showLawEnforcement: false,
  },
] as const

type ServerId = (typeof SERVERS)[number]["id"]

// ─── App ─────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<ServerId>("ime")
  const [darkMode, setDarkMode] = useState(true)

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
  }, [darkMode])

  const activeServer = SERVERS.find((s) => s.id === activeTab)!

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 antialiased relative">
      {/* ── Top Bar (Theme Toggle) ──────────────────────────────────────── */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8 z-50">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg bg-card hover:bg-muted transition-colors"
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      {/* ── Dashboard Content ────────────────────────────────── */}
      <div className="max-w-7xl mx-auto p-4 md:p-8 pt-16 md:pt-8">
        <ServerDashboard
          key={activeServer.id}
          apiUrl={activeServer.apiUrl}
          showGho={activeServer.showGho}
          showLawEnforcement={activeServer.showLawEnforcement}
          titleOverride={activeServer.id === "indopride" ? "Indopride" : undefined}
          tabsSlot={
            <div className="flex items-center gap-2 mt-8 mb-6 border-b border-border">
              {SERVERS.map((server) => (
                <button
                  key={server.id}
                  onClick={() => setActiveTab(server.id)}
                  className={`
                    px-4 py-2.5 text-sm font-semibold transition-all duration-200 border-b-2 -mb-px rounded-t-md
                    ${
                      activeTab === server.id
                        ? server.id === "indopride"
                          ? "border-green-500 bg-green-500/20 text-green-600 dark:text-green-400"
                          : "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                    }
                  `}
                >
                  {server.label}
                </button>
              ))}
            </div>
          }
        />
      </div>
    </div>
  )
}
