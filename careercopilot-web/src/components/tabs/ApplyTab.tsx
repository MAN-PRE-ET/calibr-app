import { useState, useRef, useCallback } from "react"
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip
} from "recharts"
import {
  UploadCloud, Loader2, ChevronDown, ChevronUp, Download, Sparkles,
  CheckCircle2, AlertCircle, RefreshCw, FileText
} from "lucide-react"
import { calibrAPI, type JobAnalysisResult, API_BASE } from "@/lib/api"

// ─── Circular progress ring ───────────────────────────────────────────────────
function CircularProgress({ score, animated }: { score: number; animated: boolean }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? "var(--accent-mint)" : score >= 55 ? "var(--accent-amber)" : "var(--accent-rose)"

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
        <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={animated ? offset : circumference}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 36, color, lineHeight: 1 }}>{score}</span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>MATCH</span>
      </div>
    </div>
  )
}

// ─── Gauge bar ────────────────────────────────────────────────────────────────
function GaugeBar({ value, label }: { value: number; label: string }) {
  const color = value >= 75 ? "var(--accent-mint)" : value >= 55 ? "var(--accent-amber)" : "var(--accent-rose)"
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
        <span className="font-mono text-xs font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 8px ${color}60` }} />
      </div>
    </div>
  )
}

// ─── Skill chip ───────────────────────────────────────────────────────────────
function SkillChip({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) {
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 hover:scale-105 inline-block"
      style={{ color, background: bg, border: `1px solid ${border}` }}>
      {label}
    </span>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function ApplyTab() {
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadedProfile, setUploadedProfile] = useState<any>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [jdText, setJdText] = useState("")
  const [company, setCompany] = useState("")
  const [role, setRole] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<JobAnalysisResult | null>(null)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [ringAnimated, setRingAnimated] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<any>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const [showJdDetails, setShowJdDetails] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleUpload = useCallback(async (file: File) => {
    setResumeFile(file)
    setUploading(true)
    setUploadError(null)
    setUploadedProfile(null)
    try {
      const res = await calibrAPI.uploadResume(file)
      setUploadedProfile(res.profile)
    } catch (e: any) {
      setUploadError(e.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }, [])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleUpload(f)
  }

  // ── Analyze JD ─────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!jdText.trim()) return
    setAnalyzing(true)
    setAnalyzeError(null)
    setResult(null)
    setRingAnimated(false)
    setGenerateResult(null)
    try {
      const res = await calibrAPI.analyzeJob({ jd_text: jdText, company, role })
      setResult(res)
      setTimeout(() => setRingAnimated(true), 200)
    } catch (e: any) {
      setAnalyzeError(e.message || "Analysis failed")
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Generate Resume ─────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!result?.application_id) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const res = await calibrAPI.generateResume(result.application_id)
      const downloadUrl = res.download_url.startsWith('http') ? res.download_url : `${API_BASE}${res.download_url}`
      setGenerateResult({ ...res, download_url: downloadUrl })
      window.open(downloadUrl, "_self")
    } catch (e: any) {
      setGenerateError(e.message || "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  const skillColor = (type: "strong" | "moderate" | "missing") =>
    type === "strong" ? "var(--accent-mint)" : type === "moderate" ? "var(--accent-amber)" : "var(--accent-rose)"

  const radarData = result
    ? [
      { category: "Technical", you: result.strong_match.length ? 85 : 40, required: 90 },
      { category: "Domain", you: result.moderate_match.length ? 70 : 35, required: 75 },
      { category: "Tools", you: result.missing_skills.length <= 1 ? 80 : 50, required: 80 },
      { category: "Soft", you: 75, required: 70 },
      { category: "Experience", you: 65, required: 80 },
    ]
    : []

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 pb-10 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-h1 mb-1" style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-primary)' }}>
            Opportunity Analysis
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Paste a job description to get a full intelligence report.
          </p>
        </div>

        {/* Split layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* ── LEFT: inputs ── */}
          <div className="space-y-4">
            {/* Resume upload */}
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <h2 className="font-syne font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: 15 }}>Candidate Profile</h2>

              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden"
                onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])} />

              <div
                onClick={() => !uploading && fileRef.current?.click()}
                onDrop={onDrop}
                onDragOver={e => e.preventDefault()}
                className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200"
                style={{
                  borderColor: uploadedProfile ? 'rgba(0,229,160,0.4)' : 'var(--bg-border)',
                  background: uploadedProfile ? 'rgba(0,229,160,0.04)' : 'var(--bg-elevated)',
                }}
                onMouseEnter={e => { if (!uploadedProfile) (e.currentTarget.style.borderColor = 'rgba(0,229,160,0.3)') }}
                onMouseLeave={e => { if (!uploadedProfile) (e.currentTarget.style.borderColor = 'var(--bg-border)') }}
              >
                {uploading ? (
                  <><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-mint)' }} />
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Extracting profile via CALIBR…</p></>
                ) : uploadedProfile ? (
                  <><CheckCircle2 className="w-8 h-8" style={{ color: 'var(--accent-mint)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--accent-mint)' }}>Profile uploaded — {uploadedProfile.name || "Resume"}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{uploadedProfile.skills?.length || 0} skills detected · click to replace</p></>
                ) : (
                  <><UploadCloud className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Upload Resume / CV</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PDF, DOCX, TXT</p></>
                )}
              </div>

              {uploadError && (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
                </div>
              )}

              {/* Extracted skills chips */}
              {uploadedProfile?.skills && uploadedProfile.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {uploadedProfile.skills.slice(0, 12).map((s: string) => (
                    <span key={s} className="px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ background: 'rgba(0,229,160,0.08)', color: 'var(--accent-mint)', border: '1px solid rgba(0,229,160,0.2)' }}>
                      {s}
                    </span>
                  ))}
                  {uploadedProfile.skills.length > 12 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-mono"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
                      +{uploadedProfile.skills.length - 12} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* JD Input */}
            <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              <h2 className="font-syne font-semibold mb-4" style={{ color: 'var(--text-primary)', fontSize: 15 }}>Job Description</h2>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-label block mb-1.5" style={{ color: 'var(--text-muted)' }}>TARGET ROLE</label>
                  <input className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200"
                    placeholder="e.g. ML Engineer"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(0,229,160,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--bg-border)')} />
                </div>
                <div>
                  <label className="text-label block mb-1.5" style={{ color: 'var(--text-muted)' }}>COMPANY</label>
                  <input className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200"
                    placeholder="e.g. Stripe"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(0,229,160,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--bg-border)')} />
                </div>
              </div>

              <textarea rows={10} value={jdText} onChange={e => setJdText(e.target.value)}
                placeholder="Paste the full job description here…"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none leading-relaxed transition-all duration-200"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(0,229,160,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--bg-border)')} />

              <p className="text-xs mt-1 text-right font-mono" style={{ color: 'var(--text-muted)' }}>{jdText.length} chars</p>

              <button onClick={handleAnalyze}
                disabled={!jdText.trim() || analyzing}
                className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                style={{ background: 'var(--accent-mint)', color: 'var(--text-inverse)', fontFamily: 'Syne, sans-serif', boxShadow: '0 0 16px rgba(0,229,160,0.25)' }}
                onMouseEnter={e => { if (jdText.trim() && !analyzing) (e.currentTarget.style.boxShadow = '0 0 28px rgba(0,229,160,0.4)') }}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(0,229,160,0.25)')}>
                {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing with CALIBR…</> : <><Sparkles className="w-4 h-4" /> Analyze Job Fit</>}
              </button>

              {analyzeError && (
                <div className="mt-3 flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }}>
                  <AlertCircle className="w-4 h-4 shrink-0" /> {analyzeError}
                  <button onClick={handleAnalyze} className="ml-auto flex items-center gap-1 text-xs underline">
                    <RefreshCw className="w-3 h-3" /> Retry
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: results ── */}
          <div className="space-y-4">
            {!result && !analyzing && (
              <div className="h-full flex items-center justify-center rounded-xl"
                style={{ background: 'var(--bg-surface)', border: '1px dashed var(--bg-border)', minHeight: 400 }}>
                <div className="text-center p-8">
                  <FileText className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  <p className="font-syne font-semibold" style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Analysis results will appear here</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Paste a JD and click Analyze</p>
                </div>
              </div>
            )}

            {analyzing && (
              <div className="rounded-xl p-8 flex flex-col items-center gap-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--accent-mint)' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>CALIBR is analyzing job fit with Groq LLaMA…</p>
                <div className="w-48 h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: 'var(--accent-mint)' }} />
                </div>
              </div>
            )}

            {result && (
              <>
                {/* Scores */}
                <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                  <div className="flex items-center gap-6 mb-5">
                    <CircularProgress score={result.skill_match_score ?? result.skill_match_percentage ?? 0} animated={ringAnimated} />
                    <div className="flex-1 space-y-3">
                      <GaugeBar value={result.interview_probability ?? 0} label="Interview Probability" />
                      <GaugeBar value={result.skill_match_score ?? result.skill_match_percentage ?? 0} label="Skill Match Score" />
                    </div>
                  </div>

                  {result.reasoning && (
                    <div className="p-3 rounded-xl text-sm italic" style={{
                      background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.12)', color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif'
                    }}>
                      "{result.reasoning}"
                    </div>
                  )}
                </div>

                {/* Skill columns */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { title: "STRONG", skills: result.strong_match ?? result.strong_matches ?? [], type: "strong" as const },
                    { title: "MODERATE", skills: result.moderate_match ?? result.moderate_matches ?? [], type: "moderate" as const },
                    { title: "MISSING", skills: result.missing_skills ?? [], type: "missing" as const },
                  ].map(col => (
                    <div key={col.title} className="rounded-xl p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', borderTop: `2px solid ${skillColor(col.type)}` }}>
                      <p className="text-label mb-2.5" style={{ color: skillColor(col.type), fontSize: '9px' }}>{col.title} ({col.skills.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {col.skills.length === 0 ? (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>None</span>
                        ) : col.skills.map(s => (
                          <SkillChip key={s} label={s} color={skillColor(col.type)}
                            bg={`${skillColor(col.type)}10`} border={`${skillColor(col.type)}25`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Radar */}
                <div className="rounded-xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                  <h3 className="font-syne font-semibold mb-3" style={{ color: 'var(--text-primary)', fontSize: 15 }}>Fit Radar</h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.05)" />
                        <PolarAngleAxis dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="You" dataKey="you" stroke="var(--accent-mint)" fill="var(--accent-mint)" fillOpacity={0.18} strokeWidth={2} />
                        <Radar name="Required" dataKey="required" stroke="rgba(255,255,255,0.2)" fill="none" strokeDasharray="4 3" />
                        <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', borderRadius: 8, fontSize: 12 }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* JD Details collapse */}
                {result.responsibilities && result.responsibilities.length > 0 && (
                  <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
                    <button onClick={() => setShowJdDetails(!showJdDetails)}
                      className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold"
                      style={{ color: 'var(--text-secondary)', fontFamily: 'Syne, sans-serif' }}>
                      <span>Key Responsibilities</span>
                      {showJdDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showJdDetails && (
                      <div className="border-t px-5 py-3 space-y-1.5" style={{ borderColor: 'var(--bg-border)' }}>
                        {result.responsibilities.map((r, i) => (
                          <p key={i} className="flex gap-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                            <span style={{ color: 'var(--accent-mint)', flexShrink: 0 }}>›</span>{r}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Generate resume */}
                <div className="rounded-xl p-5" style={{ background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.15)' }}>
                  <p className="text-label mb-1" style={{ color: 'var(--accent-mint)' }}>CALIBR TAILORED RESUME</p>
                  <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Generate a PDF resume tailored to this exact job description using Groq AI.</p>

                  {generateResult ? (
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--accent-mint)' }} />
                      <p className="text-sm" style={{ color: 'var(--accent-mint)' }}>Resume generated!</p>
                      <a href={generateResult.download_url} target="_blank" rel="noopener noreferrer"
                        className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: 'var(--accent-mint)', color: 'var(--text-inverse)', fontFamily: 'Syne, sans-serif' }}>
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </a>
                    </div>
                  ) : (
                    <button onClick={handleGenerate} disabled={generating}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                      style={{ background: 'var(--accent-mint)', color: 'var(--text-inverse)', fontFamily: 'Syne, sans-serif' }}>
                      {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate Tailored Resume</>}
                    </button>
                  )}

                  {generateError && (
                    <p className="mt-2 text-xs" style={{ color: 'var(--accent-rose)' }}>{generateError}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
