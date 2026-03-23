import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Loader2, AlertCircle, RefreshCw, GripVertical, ExternalLink, Clock } from "lucide-react"
import { calibrAPI, type Application, timeAgo } from "@/lib/api"

const COLUMNS: { id: Application["status"]; label: string; color: string }[] = [
  { id: "Submitted",  label: "SUBMITTED",  color: "var(--accent-sky)"    },
  { id: "In Review",  label: "IN REVIEW",  color: "var(--accent-purple)"  },
  { id: "Interview",  label: "INTERVIEW",  color: "var(--accent-amber)"  },
  { id: "Offer",      label: "OFFER",      color: "var(--accent-mint)"   },
  { id: "Rejected",   label: "REJECTED",   color: "var(--accent-rose)"   },
]

function AppCard({ app, onDragStart }: { app: Application; onDragStart: (id: string) => void }) {
  const [hovered, setHov] = useState(false)
  const matchColor = app.skill_match_score >= 75 ? "var(--accent-mint)"
    : app.skill_match_score >= 55 ? "var(--accent-amber)" : "var(--accent-rose)"
  const colColor = COLUMNS.find(c => c.id === app.status)?.color || "var(--text-muted)"

  return (
    <div
      draggable
      onDragStart={() => onDragStart(app.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="rounded-xl p-3 cursor-grab active:cursor-grabbing transition-all duration-200 select-none"
      style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--bg-border)',
        borderLeft: `3px solid ${colColor}`,
        transform: hovered ? 'scale(1.01)' : 'scale(1)',
        boxShadow: hovered ? `0 4px 14px rgba(0,0,0,0.3)` : 'none',
      }}
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold font-syne"
          style={{ background: `${colColor}15`, color: colColor }}>
          {app.company[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)', fontFamily: 'Syne, sans-serif' }}>{app.company}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)', fontFamily: 'DM Sans, sans-serif' }}>{app.role}</p>
        </div>
        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: `${matchColor}10`, color: matchColor }}>
          {app.skill_match_score}%
        </span>
      </div>

      {hovered && (
        <div className="mt-2 pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--bg-border)' }}>
          <div className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-3 h-3" />
            {timeAgo(app.date_applied)}
          </div>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)' }}>
            {app.interview_probability}% prob
          </span>
        </div>
      )}
    </div>
  )
}

export function TrackingTab() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const fetchApps = async () => {
    setLoading(true); setError(null)
    try {
      const res = await calibrAPI.getApplications()
      setApps(res.applications)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchApps() }, [])

  const handleDrop = useCallback(async (targetStatus: Application["status"]) => {
    if (!draggingId) return
    const prev = [...apps]
    // Optimistic update
    setApps(curr => curr.map(a => a.id === draggingId ? { ...a, status: targetStatus } : a))
    setDraggingId(null)
    try {
      await calibrAPI.updateAppStatus(draggingId, targetStatus)
    } catch {
      setApps(prev) // revert
    }
  }, [draggingId, apps])

  const filtered = apps.filter(a =>
    !search || a.company.toLowerCase().includes(search.toLowerCase()) ||
    a.role.toLowerCase().includes(search.toLowerCase())
  )

  const total = apps.length
  const interviews = apps.filter(a => a.status === "Interview" || a.status === "Offer").length
  const interviewRate = total > 0 ? Math.round((interviews / total) * 100) : 0
  const offerRate = total > 0 ? Math.round((apps.filter(a => a.status === "Offer").length / total) * 100) : 0

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 pb-10 space-y-5">
        {/* Header + stats */}
        <div>
          <h1 className="text-h1 mb-1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)' }}>
            Application Pipeline
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Track every application through the full funnel.</p>
        </div>

        {!loading && !error && (
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-mono">
            <span><span className="font-bold" style={{ color: 'var(--text-primary)' }}>{total}</span> <span style={{ color: 'var(--text-muted)' }}>TOTAL</span></span>
            <span><span className="font-bold" style={{ color: 'var(--accent-sky)' }}>{apps.filter(a => a.status === "In Review").length}</span> <span style={{ color: 'var(--text-muted)' }}>THIS WEEK</span></span>
            <span><span className="font-bold" style={{ color: 'var(--accent-amber)' }}>{interviewRate}%</span> <span style={{ color: 'var(--text-muted)' }}>INTERVIEW RATE</span></span>
            <span><span className="font-bold" style={{ color: 'var(--accent-mint)' }}>{offerRate}%</span> <span style={{ color: 'var(--text-muted)' }}>OFFER RATE</span></span>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search applications…"
            className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(0,229,160,0.4)')}
            onBlur={e => (e.target.style.borderColor = 'var(--bg-border)')} />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl"
            style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)' }}>
            <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--accent-rose)' }} />
            <p className="text-sm" style={{ color: 'var(--accent-rose)' }}>{error}</p>
            <button onClick={fetchApps} className="ml-auto flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--accent-mint)' }}>
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Kanban */}
        {loading ? (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 custom-scrollbar">
            {COLUMNS.map(c => (
              <div key={c.id} className="rounded-xl h-64 skeleton min-w-[280px] w-[280px] shrink-0 snap-start" style={{ background: 'var(--bg-surface)' }} />
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="rounded-xl p-16 flex flex-col items-center text-center"
            style={{ background: 'var(--bg-surface)', border: '1px dashed var(--bg-border)' }}>
            <GripVertical className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="font-syne font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontSize: 16 }}>No applications tracked yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Analyze your first job to track it here →  Opportunity Analysis</p>
          </div>
        ) : (
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 custom-scrollbar">
            {COLUMNS.map(col => {
              const colApps = filtered.filter(a => a.status === col.id)
              return (
                <div key={col.id}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(col.id)}
                  className="rounded-xl p-3 min-h-64 flex flex-col transition-all duration-200 min-w-[280px] w-[280px] shrink-0 snap-start"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 pb-2"
                    style={{ borderBottom: `2px solid ${col.color}` }}>
                    <span className="text-xs font-semibold font-mono" style={{ color: col.color }}>{col.label}</span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ background: `${col.color}15`, color: col.color }}>{colApps.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 space-y-2">
                    {colApps.map(app => (
                      <AppCard key={app.id} app={app} onDragStart={setDraggingId} />
                    ))}
                    {colApps.length === 0 && (
                      <div className="h-16 rounded-lg flex items-center justify-center"
                        style={{ border: '1px dashed var(--bg-border)', color: 'var(--text-muted)', fontSize: 11 }}>
                        drop here
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
