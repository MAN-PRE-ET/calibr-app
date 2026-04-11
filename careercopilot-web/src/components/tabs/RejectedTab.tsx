import { useState, useEffect } from "react"
import { Sparkles, Zap, CheckCircle2, AlertCircle, RefreshCw, XCircle, ExternalLink, Loader2 } from "lucide-react"
import { calibrAPI, skillColor, type Application, type RejectionAnalysisResult } from "@/lib/api"

export function RejectedTab() {
  const [apps, setApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-rejection state
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, RejectionAnalysisResult>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  const fetchRejected = async () => {
    setLoading(true); setError(null)
    try {
      const res = await calibrAPI.getApplications()
      // Show all rejected apps + any app that has notes already
      setApps(res.applications.filter(a => a.status === "Rejected"))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRejected() }, [])

  const handleAnalyze = async (appId: string) => {
    const note = notes[appId]
    if (!note?.trim()) return
    setAnalyzing(a => ({ ...a, [appId]: true }))
    setErrors(e => ({ ...e, [appId]: "" }))
    try {
      const res = await calibrAPI.analyzeRejection(appId, note)
      setResults(r => ({ ...r, [appId]: res }))
      setExpanded(e => ({ ...e, [appId]: true }))
      showToast("CALIBR Profile updated — skill confidence scores adjusted")
      // Refresh to pick up status change
      fetchRejected()
    } catch (e: any) {
      setErrors(err => ({ ...err, [appId]: e.message || "Analysis failed" }))
    } finally {
      setAnalyzing(a => ({ ...a, [appId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        {[0,1].map(i => <div key={i} className="h-48 rounded-xl skeleton" />)}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-10 h-10" style={{ color: 'var(--accent-rose)' }} />
        <p className="font-syne font-semibold" style={{ color: 'var(--text-primary)', fontSize: 18 }}>Something went wrong</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error}</p>
        <button onClick={fetchRejected} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent-mint)', color: 'var(--text-inverse)', fontFamily: 'Syne, sans-serif' }}>
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.3)', color: 'var(--accent-mint)', fontFamily: 'DM Sans, sans-serif' }}>
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {toast}
        </div>
      )}

      <div className="p-4 md:p-6 pb-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-h1 mb-1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)' }}>
            Rejection Intelligence
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Turn rejection into strategy. CALIBR learns from every "no" to build a stronger "yes".
          </p>
        </div>

        {/* Empty */}
        {apps.length === 0 && (
          <div className="rounded-xl p-16 flex flex-col items-center text-center"
            style={{ background: 'var(--bg-surface)', border: '1px dashed var(--bg-border)' }}>
            <XCircle className="w-10 h-10 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="font-syne font-semibold mb-2" style={{ color: 'var(--text-secondary)', fontSize: 16 }}>No rejections tracked yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Drag any card to Rejected in the Pipeline tab, then come back here to analyze it.</p>
          </div>
        )}

        {/* Rejection cards */}
        <div className="space-y-4">
          {apps.map(app => {
            const res = results[app.id]
            const isAnalyzing = analyzing[app.id]
            const isExpanded = expanded[app.id]
            const appError = errors[app.id]

            return (
              <div key={app.id} className="rounded-xl overflow-hidden"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: '1px solid var(--bg-border)', borderLeft: '3px solid var(--accent-rose)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)', fontFamily: 'Syne, sans-serif' }}>
                      {app.company[0]}
                    </div>
                    <div>
                      <p className="font-syne font-semibold" style={{ color: 'var(--text-primary)', fontSize: 15 }}>{app.company}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{app.role}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-1 rounded"
                    style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)' }}>
                    {app.skill_match_score}% MATCH
                  </span>
                </div>

                {/* Notes input */}
                <div className="p-5 space-y-3">
                  <label className="text-label block" style={{ color: 'var(--text-muted)' }}>REJECTION FEEDBACK / NOTES</label>
                  <textarea rows={4} value={notes[app.id] || ""}
                    onChange={e => setNotes(n => ({ ...n, [app.id]: e.target.value }))}
                    placeholder="What feedback did you receive? What felt weak in the interview?"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none leading-relaxed transition-all duration-200"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(244,63,94,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--bg-border)')} />

                  <button onClick={() => handleAnalyze(app.id)}
                    disabled={!notes[app.id]?.trim() || isAnalyzing}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                    style={{ background: 'rgba(244,63,94,0.12)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.3)', fontFamily: 'Syne, sans-serif' }}
                    onMouseEnter={e => { if (!isAnalyzing && notes[app.id]?.trim()) (e.currentTarget.style.background = 'rgba(244,63,94,0.2)') }}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(244,63,94,0.12)')}>
                    {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with Groq…</> : <><Zap className="w-4 h-4" /> Analyze Rejection</>}
                  </button>

                  {appError && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs"
                      style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }}>
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {appError}
                    </div>
                  )}
                </div>

                {/* Results */}
                {res && isExpanded && (
                  <div className="border-t mx-5 mb-5 pt-4 space-y-4" style={{ borderColor: 'var(--bg-border)' }}>
                    <p className="text-label" style={{ color: 'var(--text-muted)' }}>REJECTION INTELLIGENCE REPORT</p>

                    {/* Summary */}
                    {res.summary && (
                      <p className="text-sm italic" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>"{res.summary}"</p>
                    )}

                    {/* Gaps */}
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-rose)' }}>Identified Skill Gaps</p>
                      <div className="flex flex-wrap gap-2">
                        {res.identified_gaps.length > 0 ? res.identified_gaps.map(gap => (
                          <span key={gap} className="px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(244,63,94,0.25)' }}>
                            {gap}
                          </span>
                        )) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No specific gaps identified</span>}
                      </div>
                    </div>

                    {/* Confidence drops */}
                    {Object.keys(res.skill_confidence_impact || {}).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-amber)' }}>Confidence Adjustments</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(res.skill_confidence_impact).map(([skill, delta]) => {
                            const updated = (res.updated_skill_confidence || {})[skill]
                            const color = skillColor(updated ?? 50)
                            return (
                              <div key={skill} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{skill}</span>
                                <span className="font-mono font-bold" style={{ color: 'var(--accent-rose)' }}>{delta}</span>
                                {updated !== undefined && <span className="font-mono font-bold" style={{ color }}>→{updated}</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Learning suggestions */}
                    {res.learning_suggestions && res.learning_suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--accent-mint)' }}>Recommended Learning Paths</p>
                        <div className="flex flex-wrap gap-2">
                          {res.learning_suggestions.map((s, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                              style={{ background: 'rgba(0,229,160,0.08)', color: 'var(--accent-mint)', border: '1px solid rgba(0,229,160,0.2)' }}>
                              {s.skill} · {s.resource_type} · {s.hours}h
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Success banner */}
                    <div className="flex items-center gap-2.5 p-3 rounded-xl"
                      style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.15)' }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-mint)' }} />
                      <p className="text-xs font-medium" style={{ color: 'var(--accent-mint)' }}>
                        CALIBR Profile updated — skill confidence scores adjusted
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
