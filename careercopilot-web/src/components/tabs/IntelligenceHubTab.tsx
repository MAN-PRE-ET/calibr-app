import { useState, useEffect, useRef, useCallback } from "react"
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip
} from "recharts"
import {
  Target, Zap, BarChart3, FileCheck2, TrendingUp, TrendingDown,
  ArrowRight, Clock, AlertCircle, RefreshCw, UploadCloud, CheckCircle2
} from "lucide-react"
import { calibrAPI, timeAgo, skillColor, type DashboardMetrics } from "@/lib/api"
import { useToast } from "@/lib/toast"
import { LoadDemoButton } from "@/components/layout/DemoBanner"

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Submitted: "var(--accent-sky)",
  "In Review": "var(--accent-purple)",
  Interview: "var(--accent-amber)",
  Offer: "var(--accent-mint)",
  Rejected: "var(--accent-rose)",
}

const ACTIVITY_ICONS: Record<string, typeof Zap> = {
  job_analysis: FileCheck2,
  status_change: ArrowRight,
  rejection_analysis: Zap,
  profile_upload: UploadCloud,
  resume_generated: BarChart3,
}

// ─── Skeleton ────────────────────────────────────────────────────────────────
function KPISkeleton() {
  return (
    <div className="rounded-xl p-5 skeleton" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', height: 120 }} />
  )
}

// ─── Animated number that counts up ──────────────────────────────────────────
function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0)
  const prev = useRef(0)

  useEffect(() => {
    const target = value
    const start = prev.current
    prev.current = target
    const duration = 600
    const steps = 30
    const inc = (target - start) / steps
    let current = start
    const timer = setInterval(() => {
      current += inc
      if ((inc > 0 && current >= target) || (inc < 0 && current <= target) || inc === 0) {
        setDisplay(target)
        clearInterval(timer)
      } else {
        setDisplay(Math.round(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [value])

  return <>{display}{suffix}</>
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function MetricCard({
  label, value, suffix, delta, trend, color, glowColor
}: {
  label: string; value: number; suffix: string; delta: string; trend: "up" | "down" | "neutral"; color: string; glowColor: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="rounded-xl p-3 md:p-5 cursor-default transition-all duration-200"
      style={{
        background: 'var(--bg-surface)', border: '1px solid var(--bg-border)',
        borderLeft: `3px solid ${color}`,
        boxShadow: hovered ? `0 0 24px ${glowColor}` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p className="text-label mb-3" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex items-end justify-between mb-3">
        <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 48, color, lineHeight: 1 }}>
          <AnimatedNumber value={value} suffix={suffix} />
        </p>
        {trend === "up" && <TrendingUp className="w-4 h-4 mb-2" style={{ color }} />}
        {trend === "down" && <TrendingDown className="w-4 h-4 mb-2" style={{ color: 'var(--accent-rose)' }} />}
      </div>
      <div className="w-full h-1 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-elevated)' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, value)}%`, background: color, boxShadow: `0 0 6px ${glowColor}` }} />
      </div>
      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{delta}</p>
    </div>
  )
}


// ─── Onboarding Screen ────────────────────────────────────────────────────────
const ONBOARDING_STEPS = [
  {
    n: "1",
    title: "Upload Resume",
    desc: "CALIBR parses your skills, experience, and projects in seconds.",
    color: "var(--accent-mint)",
  },
  {
    n: "2",
    title: "Analyze Jobs",
    desc: "Paste any JD and instantly see your match score + skill gaps.",
    color: "var(--accent-sky)",
  },
  {
    n: "3",
    title: "Learn & Improve",
    desc: "Every rejection teaches CALIBR to give sharper career advice.",
    color: "var(--accent-purple)",
  },
]

function OnboardingScreen({
  onDemoLoad,
  onProfileUploaded,
}: {
  onDemoLoad?: () => void
  onProfileUploaded: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await calibrAPI.uploadResume(file)
      toast(
        'success',
        `✓ ${result.profile.name || "Profile"} uploaded — ${Object.keys(result.skill_confidence).length} skills detected`,
      )
      onProfileUploaded()
    } catch (err: any) {
      toast('error', err.message || "Upload failed. Please try again.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }, [onProfileUploaded, toast])

  return (
    <div
      className="flex flex-col items-center justify-center text-center px-6 py-8"
      style={{ minHeight: "calc(100dvh - 100px)", maxWidth: 620, margin: "0 auto" }}
    >
      <input
        ref={fileRef}
        id="resume-upload-input"
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={handleFile}
      />

      {/* Branding */}
      <div className="mb-5 animate-fade-up">
        <p style={{ fontFamily: "Syne, sans-serif", fontWeight: 800, fontSize: 36, letterSpacing: "0.2em", color: "var(--accent-mint)", textShadow: "0 0 40px rgba(0,229,160,0.4)", lineHeight: 1 }}>
          CALIBR
        </p>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 10, letterSpacing: "0.3em", color: "var(--text-muted)", textTransform: "uppercase", marginTop: 4 }}>
          Agentic Career Intelligence
        </p>
      </div>

      {/* Hero heading */}
      <div className="mb-7 animate-fade-up">
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 26, color: "var(--text-primary)", lineHeight: 1.25, marginBottom: 8 }}>
          Start by uploading your resume
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, maxWidth: 380, margin: "0 auto", fontFamily: "DM Sans, sans-serif", lineHeight: 1.7 }}>
          CALIBR extracts your skills and experience to build a personalized career intelligence dashboard in seconds.
        </p>
      </div>

      {/* ── PRIMARY CTA — upload first ── */}
      <div className="w-full max-w-sm space-y-3 animate-fade-up mb-10">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-xl font-semibold text-base transition-all duration-200"
          style={{
            background: uploading ? "var(--bg-elevated)" : "var(--accent-mint)",
            color: uploading ? "var(--text-muted)" : "var(--text-inverse)",
            fontFamily: "Syne, sans-serif",
            boxShadow: uploading ? "none" : "0 0 32px rgba(0,229,160,0.4)",
            cursor: uploading ? "not-allowed" : "pointer",
            fontSize: 15,
          }}
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Parsing your resume…
            </>
          ) : (
            <>
              <UploadCloud style={{ width: 18, height: 18 }} />
              Upload Your Resume
            </>
          )}
        </button>

        <p className="text-xs" style={{ color: "var(--text-muted)", fontFamily: "DM Sans, sans-serif" }}>
          PDF, DOCX or TXT · Processed by AI in seconds
        </p>

        {onDemoLoad && (
          <div className="pt-1">
            <p className="text-xs mb-2.5" style={{ color: "var(--text-muted)" }}>Or explore with sample data:</p>
            <LoadDemoButton onLoad={onDemoLoad} />
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-5 animate-fade-up">
        {["Private by design", "AI-powered extraction", "No cloud storage"].map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <CheckCircle2 style={{ width: 12, height: 12, color: "var(--accent-mint)", opacity: 0.7, flexShrink: 0 }} />
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function IntelligenceHubTab({ onDemoLoad }: { onDemoLoad?: () => void } = {}) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const m = await calibrAPI.getDashboardMetrics()
      setMetrics(m)
    } catch (e: any) {
      setError(e.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMetrics() }, [])

  // Build radar data from skill_confidence
  const radarData = metrics
    ? Object.entries(metrics.skill_confidence).slice(0, 6).map(([skill, score]) => ({
        category: skill.length > 10 ? skill.slice(0, 10) + "…" : skill,
        you: score,
        market: Math.min(100, score + Math.floor(Math.random() * 20 + 5)),
      }))
    : []

  const kpiCards = metrics
    ? [
        { label: "INTERVIEW PROBABILITY", value: metrics.avg_interview_probability, suffix: "%", delta: `${metrics.total_applications} apps avg`, trend: "up" as const, color: "var(--accent-amber)", glowColor: "rgba(245,158,11,0.15)" },
        { label: "APPLICATIONS SENT",     value: metrics.total_applications,         suffix: "",  delta: `${metrics.rejection_count} rejections`, trend: "neutral" as const, color: "var(--accent-sky)",   glowColor: "rgba(14,165,233,0.15)"  },
        { label: "SKILL MATCH AVG",        value: metrics.avg_skill_match,            suffix: "%", delta: "Across all apps",       trend: (metrics.avg_skill_match >= 65 ? "up" : "down") as "up" | "down", color: "var(--accent-mint)",  glowColor: "rgba(0,229,160,0.15)"   },
        { label: "REJECTION INSIGHTS",     value: metrics.rejection_count,            suffix: "",  delta: metrics.top_missing_skill !== "N/A" ? `Top gap: ${metrics.top_missing_skill}` : "No patterns yet", trend: "neutral" as const, color: "var(--accent-rose)", glowColor: "rgba(244,63,94,0.15)" },
      ]
    : []

  const byStatus = metrics?.applications_by_status || {}

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="h-10 w-56 rounded-xl skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0,1,2,3].map(i => <KPISkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-64 rounded-xl skeleton" />
          <div className="h-64 rounded-xl skeleton" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-10 h-10" style={{ color: 'var(--accent-rose)' }} />
        <p className="font-syne font-semibold" style={{ color: 'var(--text-primary)', fontSize: 18 }}>Something went wrong</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error}</p>
        <button onClick={fetchMetrics} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent-mint)', color: 'var(--text-inverse)', fontFamily: 'Syne, sans-serif' }}>
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    )
  }

  if (!metrics?.has_profile) {
    return <OnboardingScreen onDemoLoad={onDemoLoad} onProfileUploaded={fetchMetrics} />
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-10">
      <div className="animate-fade-up flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 mb-1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)' }}>
            Intelligence Hub
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Your real-time career intelligence dashboard.</p>
        </div>
        {onDemoLoad && <LoadDemoButton onLoad={onDemoLoad} />}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 animate-fade-up">
        {kpiCards.map((card, i) => <MetricCard key={i} {...card} />)}
      </div>

      {/* Radar + Mini Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fade-up">
        {/* Skill Radar */}
        <div className="rounded-xl p-4 md:p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-syne font-semibold" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Skill Confidence</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Based on profile + rejections</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--accent-mint)' }} /><span style={{ color: 'var(--text-secondary)' }}>You</span></span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--accent-sky)' }} /><span style={{ color: 'var(--text-secondary)' }}>Market</span></span>
            </div>
          </div>
          {radarData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.06)" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="You" dataKey="you" stroke="var(--accent-mint)" fill="var(--accent-mint)" fillOpacity={0.18} strokeWidth={2} />
                  <Radar name="Market" dataKey="market" stroke="var(--accent-sky)" fill="var(--accent-sky)" fillOpacity={0.12} strokeWidth={1.5} strokeDasharray="4 3" />
                  <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload a resume to see your skill radar</p>
            </div>
          )}
        </div>

        {/* Mini Kanban */}
        <div className="rounded-xl p-4 md:p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-syne font-semibold" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Application Pipeline</h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{metrics.total_applications} total tracked</p>
            </div>
            <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 h-52 pb-2 custom-scrollbar">
            {Object.entries(STATUS_COLORS).map(([status, color]) => {
              const cards = byStatus[status] || []
              return (
                <div key={status} className="flex flex-col min-w-[130px] flex-1 snap-start">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-medium uppercase tracking-widest truncate" style={{ color }}>{status.split(" ")[0]}</span>
                    <span className="font-mono text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: `${color}15`, color }}>{cards.length}</span>
                  </div>
                  <div className="flex-1 rounded-lg overflow-hidden space-y-1 p-1"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
                    {cards.slice(0, 3).map((app, i) => (
                      <div key={i} className="h-6 rounded-md w-full flex items-center px-1.5"
                        style={{ background: 'var(--bg-surface)', borderLeft: `2px solid ${color}`, opacity: 0.9 - i * 0.15 }}>
                        <span className="text-[9px] truncate" style={{ color: 'var(--text-muted)' }}>{app.company}</span>
                      </div>
                    ))}
                    {cards.length > 3 && (
                      <p className="text-[8px] text-center font-mono" style={{ color: 'var(--text-muted)' }}>+{cards.length - 3}</p>
                    )}
                    {cards.length === 0 && (
                      <div className="h-full flex items-center justify-center opacity-30">
                        <Target className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-xl p-5 animate-fade-up" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <h3 className="font-syne font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Recent Activity</h3>
        {metrics.recent_activity.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
            No activity yet — start by analyzing a job description.
          </p>
        ) : (
          <div className="space-y-2">
            {metrics.recent_activity.map((item, i) => {
              const Icon = ACTIVITY_ICONS[item.type] || Zap
              const accentColors = ["var(--accent-sky)", "var(--accent-rose)", "var(--accent-mint)", "var(--accent-amber)", "var(--accent-purple)"]
              const color = accentColors[i % accentColors.length]
              return (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 cursor-default"
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <p className="flex-1 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>{item.text}</p>
                  <div className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3 h-3" />
                    {timeAgo(item.timestamp)}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Skill confidence chips */}
      {Object.keys(metrics.skill_confidence).length > 0 && (
        <div className="rounded-xl p-5 animate-fade-up" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <h3 className="font-syne font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Live Skill Confidence</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.skill_confidence).sort((a, b) => b[1] - a[1]).map(([skill, score]) => {
              const color = skillColor(score)
              return (
                <div key={skill} className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 hover:scale-105"
                  style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                  <span className="text-sm font-medium" style={{ color }}>{skill}</span>
                  <span className="font-mono text-xs font-bold" style={{ color }}>{score}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
