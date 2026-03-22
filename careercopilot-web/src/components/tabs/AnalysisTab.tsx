import { useState, useEffect } from "react"
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ReferenceLine, Legend
} from "recharts"
import { TrendingUp, Layers, Target, ArrowRight, ShieldAlert, AlertCircle, RefreshCw } from "lucide-react"
import { calibrAPI, type CareerAnalysisResult } from "@/lib/api"

export function AnalysisTab() {
  const [data, setData] = useState<CareerAnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true); setError(null)
    try {
      const res = await calibrAPI.getCareerAnalysis()
      setData(res)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-10 w-56 rounded-xl skeleton" />
        <div className="grid grid-cols-3 gap-4">{[0,1,2].map(i => <div key={i} className="h-28 rounded-xl skeleton" />)}</div>
        <div className="grid grid-cols-2 gap-5">{[0,1].map(i => <div key={i} className="h-64 rounded-xl skeleton" />)}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="w-10 h-10" style={{ color: 'var(--accent-rose)' }} />
        <p className="font-syne font-semibold" style={{ color: 'var(--text-primary)', fontSize: 18 }}>Something went wrong</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{error}</p>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent-mint)', color: 'var(--text-inverse)', fontFamily: 'Syne, sans-serif' }}>
          <RefreshCw className="w-4 h-4" /> Try again
        </button>
      </div>
    )
  }

  if (!data || data.status === "insufficient_data") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center" style={{ minHeight: 500 }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
          <ShieldAlert className="w-9 h-9" style={{ color: 'var(--accent-purple)' }} />
        </div>
        <h2 className="font-syne font-bold mb-2" style={{ fontSize: 24, color: 'var(--text-primary)' }}>Intelligence Gathering</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 400 }}>
          {data?.message || "Analyze at least 2 rejections in Rejection Intelligence to unlock career patterns."}
        </p>
        <button className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'var(--accent-mint)', color: 'var(--text-inverse)', boxShadow: '0 0 16px rgba(0,229,160,0.25)', fontFamily: 'Syne, sans-serif' }}>
          Go to Rejection Intel <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const gapFreq = data.gap_frequencies || data.recurring_skill_gaps || {}
  const chartData = Object.entries(gapFreq).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6)
    .map(([name, count]) => ({ name, count }))

  const score = data.strategy_score
  const trajectory = [
    { month: "N-4", score: Math.max(0, score - 20), projected: null },
    { month: "N-3", score: Math.max(0, score - 14), projected: null },
    { month: "N-2", score: Math.max(0, score - 8),  projected: null },
    { month: "N-1", score: Math.max(0, score - 3),  projected: null },
    { month: "Now", score,                           projected: null },
    { month: "+1",  score: null, projected: Math.min(100, score + 5) },
    { month: "+2",  score: null, projected: Math.min(100, score + 10) },
    { month: "+3",  score: null, projected: Math.min(100, score + 16) },
  ]

  const insightCards = [
    { label: "TOP RECURRING GAP",  value: data.top_recurring_gaps?.[0] || "N/A", icon: TrendingUp, color: 'var(--accent-rose)', large: false },
    { label: "STRONGEST DOMAIN",   value: data.strongest_domain || "N/A",         icon: Layers,     color: 'var(--accent-mint)', large: false },
    { label: "STRATEGY SCORE",     value: `${score}`,                              icon: Target,     color: 'var(--accent-amber)', large: true  },
  ]

  const CustomTooltip = ({ active, payload, label }: any) => active && payload?.length ? (
    <div className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', fontSize: 12 }}>
      <p className="font-syne font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((e: any, i: number) => (
        <p key={i} className="font-mono" style={{ color: 'var(--accent-mint)' }}>Freq: {e.value}</p>
      ))}
    </div>
  ) : null

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 pb-10 space-y-6">
        <div>
          <h1 className="text-h1 mb-1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)' }}>Career Intelligence</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Bloomberg-grade pattern analysis across your entire job search.</p>
        </div>

        {/* Insight cards */}
        <div className="grid grid-cols-3 gap-4">
          {insightCards.map(card => {
            const Icon = card.icon
            return (
              <div key={card.label} className="rounded-xl p-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderLeft: `3px solid ${card.color}` }}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4" style={{ color: card.color }} />
                  <span className="text-label" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{card.label}</span>
                </div>
                <p className="leading-none font-bold"
                  style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: card.large ? 48 : 28, color: card.color }}>
                  {card.value}{card.large && <span className="text-lg">/100</span>}
                </p>
              </div>
            )
          })}
        </div>

        {/* 2-col: heatmap + roadmap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <h3 className="font-syne font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Skill Gap Heatmap</h3>
            {Object.keys(gapFreq).length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No gap data yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(gapFreq).sort((a: any, b: any) => b[1] - a[1]).map(([skill, count]: any) => {
                  const color = count >= 3 ? 'var(--accent-rose)' : count >= 2 ? 'var(--accent-amber)' : 'var(--accent-mint)'
                  const label = count >= 3 ? "CRITICAL" : count >= 2 ? "MODERATE" : "MINOR"
                  return (
                    <div key={skill} className="p-3 rounded-xl flex flex-col gap-1 transition-all duration-200 hover:scale-[1.02] cursor-default"
                      style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate" style={{ color }}>{skill}</span>
                        <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>{count}</span>
                      </div>
                      <span className="text-label" style={{ color, fontSize: '9px', opacity: 0.7 }}>{label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <h3 className="font-syne font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Learning Roadmap</h3>
            <div className="space-y-3 relative">
              <div className="absolute left-3.5 top-0 bottom-0 w-0.5 rounded-full"
                style={{ background: 'linear-gradient(to bottom, var(--accent-mint), transparent)' }} />
              {data.learning_roadmap.map((step: any, i) => (
                <div key={i} className="flex gap-4 relative">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0 z-10"
                    style={{ background: 'var(--bg-elevated)', border: '2px solid var(--accent-mint)', color: 'var(--accent-mint)', boxShadow: '0 0 10px rgba(0,229,160,0.2)' }}>
                    {typeof step === 'object' ? step.step : i + 1}
                  </div>
                  <div className="flex-1 rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
                    {typeof step === 'object' ? (
                      <>
                        <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent-mint)', fontFamily: 'JetBrains Mono, monospace' }}>{step.skill}</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                          {step.description} · {step.resource_type} · {step.hours}h
                        </p>
                      </>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>{step as string}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bar chart */}
        {chartData.length > 0 && (
          <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <h3 className="font-syne font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Recurring Skill Gaps — Frequency</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--accent-rose)" stopOpacity={0.7} />
                      <stop offset="100%" stopColor="var(--accent-amber)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-elevated)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} fontFamily="JetBrains Mono" />
                  <YAxis dataKey="name" type="category" width={90} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} fontFamily="DM Sans" />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="count" fill="url(#barGrad)" radius={[0, 6, 6, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Career trajectory */}
        <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-syne font-semibold" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Career Trajectory</h3>
            <span className="text-label px-2 py-1 rounded" style={{ color: 'var(--accent-mint)', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.15)', fontSize: '9px' }}>PROJECTED →</span>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trajectory} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-elevated)" />
                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                <YAxis domain={[Math.max(0, score - 30), Math.min(100, score + 25)]} stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine x="Now" stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" label={{ value: "Today", fill: 'var(--text-muted)', fontSize: 10 }} />
                <Line type="monotone" dataKey="score" stroke="var(--accent-mint)" strokeWidth={2} dot={{ fill: 'var(--accent-mint)', r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="projected" stroke="var(--accent-sky)" strokeWidth={2} strokeDasharray="5 4" dot={{ fill: 'var(--accent-sky)', r: 3 }} connectNulls={false} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strategic summary */}
        <div className="rounded-xl p-5" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
          <p className="text-label mb-2" style={{ color: 'var(--accent-purple)' }}>STRATEGIC SUMMARY</p>
          <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
            "{data.career_trajectory_insight || data.summary}"
          </p>
        </div>
      </div>
    </div>
  )
}
