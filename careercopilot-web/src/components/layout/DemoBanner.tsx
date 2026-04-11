import { useState } from "react"
import { Zap, X } from "lucide-react"
import { calibrAPI } from "@/lib/api"
import { useToast } from "@/lib/toast"

/**
 * Amber demo mode banner — shown when demo=true in URL or after seed.
 * Pass `demoActive` and `setDemoActive` from parent state.
 */
export function DemoBanner({
  demoActive,
  setDemoActive,
  onReload,
}: {
  demoActive: boolean
  setDemoActive: (v: boolean) => void
  onReload: () => void
}) {
  const { toast } = useToast()
  const [seeding, setSeeding] = useState(false)
  const [resetting, setResetting] = useState(false)

  if (!demoActive) return null

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await (calibrAPI as any).seedDemo()
      toast("success", "Demo data loaded! Explore CALIBR with Arjun's profile.")
      setDemoActive(true)
      onReload()
    } catch (e: any) {
      toast("error", e.message || "Failed to load demo data")
    } finally {
      setSeeding(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      await (calibrAPI as any).resetDemo()
      toast("info", "App reset to empty state.")
      setDemoActive(false)
      onReload()
    } catch (e: any) {
      toast("error", e.message || "Failed to reset")
    } finally {
      setResetting(false)
    }
  }

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 shrink-0"
      style={{
        background: "rgba(245,158,11,0.08)",
        borderBottom: "1px solid rgba(245,158,11,0.2)",
      }}
    >
      <Zap style={{ width: 12, height: 12, color: "var(--accent-amber)", flexShrink: 0 }} />
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
        style={{
          background: "rgba(245,158,11,0.15)",
          color: "var(--accent-amber)",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 10,
        }}
      >
        DEMO
      </span>
      <span className="hidden sm:block flex-1 text-xs truncate" style={{ color: "var(--accent-amber)", opacity: 0.8 }}>
        Exploring with Arjun Mehta's sample data
      </span>
      <span className="sm:hidden flex-1 text-xs" style={{ color: "var(--accent-amber)", opacity: 0.8 }}>
        Arjun Mehta
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleReset}
          disabled={resetting}
          className="text-xs font-medium px-2 py-0.5 rounded-md transition-all duration-150"
          style={{
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--bg-border)",
          }}
        >
          {resetting ? "…" : "Reset"}
        </button>
        <button
          onClick={() => setDemoActive(false)}
          style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: 2 }}
        >
          <X style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  )
}

/**
 * "⚡ Load Demo Data" ghost button for use in IntelligenceHubTab.
 */
export function LoadDemoButton({ onLoad }: { onLoad: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setLoading(true)
    try {
      await (calibrAPI as any).seedDemo()
      toast("success", "Demo data loaded! Explore CALIBR with Arjun's profile.")
      onLoad()
    } catch (e: any) {
      toast("error", e.message || "Failed to load demo data")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={loading}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
      style={{
        background: "transparent",
        color: loading ? "var(--text-muted)" : "var(--accent-amber)",
        border: "1px solid rgba(245,158,11,0.25)",
      }}
      onMouseEnter={e => !loading && (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      <Zap style={{ width: 11, height: 11 }} />
      {loading ? "Loading…" : "Load Demo Data"}
    </button>
  )
}
