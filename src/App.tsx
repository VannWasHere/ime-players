import { useEffect, useState } from "react"
import ServerDashboard from "@/components/ServerDashboard"

// ─── Server configs ──────────────────────────────────────────────────
const SERVERS = [
  {
    id: "ime",
    label: "iMe",
    apiUrl: "https://frontend.cfx-services.net/api/servers/single/zrvmg4",
    showGho: true,
  },
  {
    id: "indopride",
    label: "Indopride",
    apiUrl: "https://frontend.cfx-services.net/api/servers/single/bak4pl",
    showGho: false,
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 antialiased">
      {/* ── Top Tab Bar ──────────────────────────────────────── */}
      <div className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-14">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {SERVERS.map((server) => (
              <button
                key={server.id}
                onClick={() => setActiveTab(server.id)}
                className={`
                  relative px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200
                  ${
                    activeTab === server.id
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }
                `}
              >
                {server.label}
                {activeTab === server.id && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg bg-card hover:bg-muted transition-colors"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>

      {/* ── Dashboard Content ────────────────────────────────── */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <ServerDashboard
          key={activeServer.id}
          apiUrl={activeServer.apiUrl}
          showGho={activeServer.showGho}
        />
      </div>
    </div>
  )
}
