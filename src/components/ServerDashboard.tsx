import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Search,
  Server,
  Users,
  Activity,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Wifi,
  WifiOff,
  Shield,
} from "lucide-react"

import ghoLogo from "@/assets/GHO_GANG_NEW_LOGO.png"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getCachedServerData,
  isWithinMinRefreshInterval,
  setCachedServerData,
} from "@/lib/serverDataCache"

// ─── Types ───────────────────────────────────────────────────────────
interface Player {
  endpoint: string
  id: number
  identifiers: string[]
  name: string
  ping: number
}

interface ServerData {
  hostname: string
  clients: number
  sv_maxclients: number
  players: Player[]
  server: string
  vars: Record<string, string>
}

type SortKey = "id" | "name" | "ping"
type SortDir = "asc" | "desc"

// ─── Helpers ─────────────────────────────────────────────────────────
const cleanHostname = (n: string) => n.replace(/\^[0-9]/g, "")

const getPingColor = (ping: number) => {
  if (ping < 50) return "text-emerald-400"
  if (ping < 100) return "text-yellow-400"
  if (ping < 150) return "text-orange-400"
  return "text-red-400"
}

const getPingIcon = (ping: number) => {
  if (ping < 100) return <Wifi className="w-3 h-3 inline mr-1" />
  return <WifiOff className="w-3 h-3 inline mr-1" />
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// ─── Props ───────────────────────────────────────────────────────────
interface ServerDashboardProps {
  apiUrl: string
  showGho?: boolean
  showLawEnforcement?: boolean
  tabsSlot?: React.ReactNode
  titleOverride?: string
}

// ─── Component ───────────────────────────────────────────────────────
export default function ServerDashboard({ apiUrl, showGho = false, showLawEnforcement = true, tabsSlot, titleOverride }: ServerDashboardProps) {
  const hasSidebar = showLawEnforcement || showGho
  const [data, setData] = useState<ServerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  // Table state
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("id")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // ─── Fetch ───────────────────────────────────────────────────────
  const fetchServerInfo = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)

    // Serve from cache if user is refreshing too fast (within min interval)
    if (isManual && isWithinMinRefreshInterval(apiUrl)) {
      const cached = getCachedServerData(apiUrl)
      if (cached?.data) {
        setData(cached.data as ServerData)
        setLastFetched(cached.fetchedAt)
        setLoading(false)
        setRefreshing(false)
        return
      }
    }

    // On initial load, use cache if valid to avoid unnecessary fetch
    if (!isManual) {
      const cached = getCachedServerData(apiUrl)
      if (cached?.data) {
        setData(cached.data as ServerData)
        setLastFetched(cached.fetchedAt)
        setLoading(false)
        setRefreshing(false)
        return
      }
    }

    try {
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error("Failed to fetch server data")
      const json = await response.json()
      const serverData = json.Data
      setData(serverData)
      setError(null)
      setLastFetched(new Date())
      setCachedServerData(apiUrl, serverData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiUrl])

  useEffect(() => {
    setLoading(true)
    setData(null)
    setError(null)
    setSearch("")
    setPage(1)
    fetchServerInfo()
  }, [fetchServerInfo])

  // ─── Sorting ─────────────────────────────────────────────────────
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(1)
  }

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-40" />
    return sortDir === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1" />
    )
  }

  // ─── Derived data ────────────────────────────────────────────────
  const filteredAndSorted = useMemo(() => {
    if (!data?.players) return []

    let players = [...data.players]

    if (search.trim()) {
      const q = search.toLowerCase()
      players = players.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toString().includes(q)
      )
    }

    players.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "id":
          cmp = a.id - b.id
          break
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "ping":
          cmp = a.ping - b.ping
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })

    return players
  }, [data?.players, search, sortKey, sortDir])

  const totalFiltered = filteredAndSorted.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [totalPages])

  const paginatedPlayers = useMemo(
    () => filteredAndSorted.slice((page - 1) * pageSize, page * pageSize),
    [filteredAndSorted, page, pageSize]
  )

  // ─── Ping stats ──────────────────────────────────────────────────
  const pingStats = useMemo(() => {
    if (!data?.players?.length) return { avg: 0, min: 0, max: 0 }
    const pings = data.players.map((p) => p.ping)
    return {
      avg: Math.round(pings.reduce((a, b) => a + b, 0) / pings.length),
      min: Math.min(...pings),
      max: Math.max(...pings),
    }
  }, [data?.players])

  // ─── Faction tracking ────────────────────────────────────────────
  const lspdCount = useMemo(() => {
    if (!data?.players) return 0
    return data.players.filter((p) => p.name.toUpperCase().includes("LSPD")).length
  }, [data?.players])

  const lssdCount = useMemo(() => {
    if (!data?.players) return 0
    return data.players.filter((p) => p.name.toUpperCase().includes("LSSD")).length
  }, [data?.players])

  const ghoPlayers = useMemo(() => {
    if (!data?.players) return []
    return data.players.filter((p) =>
      p.name.toLowerCase().includes("gho")
    )
  }, [data?.players])

  // ─── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Server className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              {titleOverride ?? (data ? cleanHostname(data.hostname) : "Loading...")}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2 mt-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              Server is online
              {lastFetched && (
                <span className="text-xs text-muted-foreground/60 ml-2">
                  · Last updated {lastFetched.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchServerInfo(true)}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </header>

      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg flex items-center gap-3">
          <Activity className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── Stats Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Players Online
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold">{data?.clients ?? "—"}</span>
              <span className="text-sm text-muted-foreground">/ {data?.sv_maxclients ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Ping
            </CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-bold ${getPingColor(pingStats.avg)}`}>
                {data ? pingStats.avg : "—"}
              </span>
              <span className="text-sm text-muted-foreground">ms</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Framework
            </CardTitle>
            <Server className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold truncate">
              {data?.server.split(" ")[0] ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {data?.vars?.["txAdmin-version"] ? `txAdmin ${data.vars["txAdmin-version"]}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Game Type
            </CardTitle>
            <Wifi className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">
              {data?.vars?.gamename?.toUpperCase() ?? "GTA5"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {data?.vars?.tags ?? "roleplay"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs (Injected) ──────────────────────────────────── */}
      {tabsSlot}

      {/* ── Main Content: Table + Sidebar ────────────────────── */}
      <div className={`grid grid-cols-1 ${hasSidebar ? "lg:grid-cols-[1fr_320px] gap-6" : "gap-0"}`}>

        {/* ── Player Table ──────────────────────────────────────── */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle>Player Roster</CardTitle>
                  <CardDescription>
                    {loading
                      ? "Loading..."
                      : `${totalFiltered} player${totalFiltered !== 1 ? "s" : ""} found`}
                    {search && ` matching "${search}"`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-full md:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by name or ID..."
                      className="pl-9 bg-background"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value)
                        setPage(1)
                      }}
                      disabled={loading || !!error}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">Per page</span>
                    <Select
                      value={String(pageSize)}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value))
                        setPage(1)
                      }}
                      className="w-[70px]"
                    >
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> &lt;50ms
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-yellow-400" /> 50-99ms
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400" /> 100-149ms
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> 150ms+
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <RefreshCw className="w-8 h-8 animate-spin text-primary mb-4" />
                <p>Establishing connection...</p>
              </div>
            ) : paginatedPlayers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[100px]">
                      <button
                        className="flex items-center font-medium hover:text-foreground transition-colors"
                        onClick={() => handleSort("id")}
                      >
                        ID <SortIcon column="id" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center font-medium hover:text-foreground transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        Name <SortIcon column="name" />
                      </button>
                    </TableHead>
                    <TableHead className="text-right w-[120px]">
                      <button
                        className="flex items-center justify-end font-medium hover:text-foreground transition-colors ml-auto"
                        onClick={() => handleSort("ping")}
                      >
                        Ping <SortIcon column="ping" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPlayers.map((player) => (
                    <TableRow key={player.id} className="group">
                      <TableCell className="font-mono text-muted-foreground group-hover:text-foreground transition-colors text-sm">
                        #{player.id}
                      </TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={`font-mono text-xs ${getPingColor(player.ping)} bg-background group-hover:bg-muted border-border`}
                        >
                          {getPingIcon(player.ping)}
                          {player.ping} ms
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center p-16 text-center text-muted-foreground">
                <Users className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No players found</p>
                <p className="text-sm">Try adjusting your search criteria</p>
              </div>
            )}
          </CardContent>

          {!loading && totalFiltered > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t px-6 py-4 bg-muted/10">
              <p className="text-sm text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {(page - 1) * pageSize + 1}
                </span>
                –
                <span className="font-medium text-foreground">
                  {Math.min(page * pageSize, totalFiltered)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground">{totalFiltered}</span>{" "}
                players
              </p>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (p === 1 || p === totalPages) return true
                      if (Math.abs(p - page) <= 1) return true
                      return false
                    })
                    .reduce<(number | "dots")[]>((acc, p, i, arr) => {
                      if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("dots")
                      acc.push(p)
                      return acc
                    }, [])
                    .map((item, i) =>
                      item === "dots" ? (
                        <span key={`dots-${i}`} className="px-1 text-muted-foreground text-sm select-none">
                          …
                        </span>
                      ) : (
                        <Button
                          key={item}
                          variant={page === item ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8 text-xs"
                          onClick={() => setPage(item)}
                        >
                          {item}
                        </Button>
                      )
                    )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

      {/* ── Right Sidebar: Faction Insights ───────────────────── */}
      {hasSidebar && (
        <div className="space-y-4">

          {/* LSPD + LSSD Count */}
          {showLawEnforcement && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-base">Law Enforcement</CardTitle>
                </div>
                <CardDescription>LSPD & LSSD online count</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span className="text-sm font-medium">LSPD</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-sm px-3">
                    {loading ? "—" : lspdCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span className="text-sm font-medium">LSSD</span>
                  </div>
                  <Badge variant="secondary" className="font-mono text-sm px-3">
                    {loading ? "—" : lssdCount}
                  </Badge>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-muted-foreground">Total</span>
                  <Badge className="font-mono text-sm px-3">
                    {loading ? "—" : lspdCount + lssdCount}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* GHO Players — only shown for iMe */}
          {showGho && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={ghoLogo} alt="GHO" className="w-6 h-6 rounded" />
                    <CardTitle className="text-base">GHO Members</CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {loading ? "—" : ghoPlayers.length}
                  </Badge>
                </div>
                <CardDescription>Players with GHO tag online</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : ghoPlayers.length > 0 ? (
                  <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                    {ghoPlayers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                          <span className="font-medium truncate">{p.name}</span>
                        </div>
                        <span className={`font-mono text-xs shrink-0 ml-2 ${getPingColor(p.ping)}`}>
                          {p.ping}ms
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <img src={ghoLogo} alt="GHO" className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No GHO members online</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      )}
      </div>
    </div>
  )
}
