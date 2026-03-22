import { useState, useEffect, useRef, useCallback } from "react"
import {
  Wrench, MessageCircle, Package, User2, Clock, ChevronRight,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, BarChart2,
  ArrowRight, RotateCcw, Trophy, Zap, History, Check, X
} from "lucide-react"
import {
  calibrAPI, type Application, type InterviewType, type InterviewSession,
  type InterviewQuestion, type QuestionEvaluation, type InterviewReport,
  type InterviewSessionSummary, type InterviewSessionDetail, timeAgo
} from "@/lib/api"
import { useToast } from "@/lib/toast"

// ─── Helpers ────────────────────────────────────────────────────────────────

const INTERVIEW_TYPES: { id: InterviewType; label: string; icon: typeof Wrench; desc: string; color: string }[] = [
  { id: "technical",  label: "Technical",   icon: Wrench,         desc: "Coding & Systems",  color: "var(--accent-sky)"    },
  { id: "behavioral", label: "Behavioral",  icon: MessageCircle,  desc: "STAR & Soft Skills", color: "var(--accent-purple)" },
  { id: "product",    label: "Product",     icon: Package,        desc: "PM & Strategy",      color: "var(--accent-amber)"  },
  { id: "hr",         label: "HR Round",    icon: User2,          desc: "Culture & Fit",      color: "var(--accent-mint)"   },
]

const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   "var(--accent-mint)",
  medium: "var(--accent-amber)",
  hard:   "var(--accent-rose)",
}

const VERDICT_COLORS: Record<string, string> = {
  Strong:      "var(--accent-mint)",
  Good:        "var(--accent-sky)",
  "Needs Work": "var(--accent-amber)",
  Weak:        "var(--accent-rose)",
}

const GRADE_COLORS: Record<string, string> = {
  Excellent:    "var(--accent-mint)",
  Good:         "var(--accent-sky)",
  Average:      "var(--accent-amber)",
  "Needs Work": "var(--accent-rose)",
}

// words / 130 wpm → minutes
function estimateSpeakTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const mins = Math.max(0.5, words / 130)
  if (mins < 1) return `~${Math.round(mins * 60)}s spoken`
  return `~${mins.toFixed(1)} min spoken`
}

// ─── Stage 0 — Setup ────────────────────────────────────────────────────────

function SetupScreen({
  apps,
  history,
  onStart,
  onShowHistory,
  loading,
}: {
  apps: Application[]
  history: InterviewSessionSummary[]
  onStart: (appId: string, type: InterviewType) => void
  onShowHistory: () => void
  loading: boolean
}) {
  const [selectedApp, setSelectedApp] = useState("")
  const [selectedType, setSelectedType] = useState<InterviewType | "">("")

  const canStart = selectedApp !== "" && selectedType !== ""

  return (
    <div className="p-6 space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 animate-fade-up">
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 28, color: "var(--text-primary)" }}>
          Interview Simulator
        </h1>
        <span
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold animate-pulse"
          style={{
            background: "rgba(245,158,11,0.12)",
            border: "1px solid rgba(245,158,11,0.25)",
            color: "var(--accent-amber)",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          ⚡ Beta
        </span>
      </div>

      {/* Two-panel setup */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 animate-fade-up">
        {/* LEFT — Select Application */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
          <h3 className="font-syne font-semibold" style={{ color: "var(--text-primary)", fontSize: 15 }}>
            Select Application
          </h3>
          {apps.length === 0 ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
              No applications tracked. Analyze a job description first.
            </p>
          ) : (
            <div className="space-y-2">
              {apps.map(app => (
                <button
                  key={app.id}
                  onClick={() => setSelectedApp(app.id)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150"
                  style={{
                    background: selectedApp === app.id ? "rgba(0,229,160,0.08)" : "var(--bg-elevated)",
                    border: selectedApp === app.id ? "1px solid rgba(0,229,160,0.3)" : "1px solid var(--bg-border)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm"
                    style={{
                      background: selectedApp === app.id ? "rgba(0,229,160,0.15)" : "var(--bg-surface)",
                      color: "var(--accent-mint)",
                      fontFamily: "Syne, sans-serif",
                    }}
                  >
                    {app.company[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{app.company}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{app.role}</p>
                  </div>
                  <div
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{
                      background: "rgba(0,229,160,0.08)",
                      color: "var(--accent-mint)",
                    }}
                  >
                    {app.skill_match_score}%
                  </div>
                  {selectedApp === app.id && <Check style={{ width: 14, height: 14, color: "var(--accent-mint)", flexShrink: 0 }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Interview Type */}
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
          <h3 className="font-syne font-semibold" style={{ color: "var(--text-primary)", fontSize: 15 }}>
            Interview Type
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {INTERVIEW_TYPES.map(t => {
              const Icon = t.icon
              const isSelected = selectedType === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-150"
                  style={{
                    background: isSelected ? `${t.color}12` : "var(--bg-elevated)",
                    border: isSelected ? `1.5px solid ${t.color}` : "1px solid var(--bg-border)",
                    transform: isSelected ? "scale(1.02)" : "scale(1)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: isSelected ? `${t.color}20` : "var(--bg-surface)" }}
                  >
                    <Icon style={{ width: 18, height: 18, color: isSelected ? t.color : "var(--text-muted)" }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold" style={{ color: isSelected ? t.color : "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>
                      {t.label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{t.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Start CTA */}
      <button
        onClick={() => canStart && onStart(selectedApp, selectedType as InterviewType)}
        disabled={!canStart || loading}
        className="w-full py-4 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-200 animate-fade-up"
        style={{
          background: canStart ? "var(--accent-mint)" : "var(--bg-elevated)",
          color: canStart ? "var(--text-inverse)" : "var(--text-muted)",
          fontFamily: "Syne, sans-serif",
          boxShadow: canStart ? "0 0 24px rgba(0,229,160,0.3)" : "none",
          cursor: canStart ? "pointer" : "not-allowed",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Generating questions...
          </>
        ) : (
          <>
            Start Interview
            <ArrowRight style={{ width: 16, height: 16 }} />
          </>
        )}
      </button>

      {/* Past Sessions */}
      {history.length > 0 && (
        <div className="animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-syne font-semibold" style={{ color: "var(--text-primary)", fontSize: 15 }}>Past Sessions</h3>
            <button
              onClick={onShowHistory}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: "var(--accent-mint)" }}
            >
              View All <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {history.slice(0, 6).map(s => {
              const gradeColor = s.performance_grade ? GRADE_COLORS[s.performance_grade] : "var(--text-muted)"
              return (
                <div
                  key={s.session_id}
                  className="shrink-0 rounded-xl p-4 space-y-2"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", minWidth: 180 }}
                >
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)", fontFamily: "Syne, sans-serif" }}>{s.company}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{s.role}</p>
                  <div className="flex items-center justify-between">
                    {s.overall_score !== undefined && s.overall_score !== null ? (
                      <span
                        className="font-mono font-bold text-sm"
                        style={{ color: gradeColor }}
                      >
                        {s.overall_score}/100
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>In progress</span>
                    )}
                    <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>{timeAgo(s.started_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stage 1 — Question ─────────────────────────────────────────────────────

function QuestionScreen({
  session,
  currentIndex,
  onSubmit,
  onSkip,
  evaluation,
  submitting,
  onNext,
}: {
  session: InterviewSession
  currentIndex: number
  onSubmit: (answer: string) => void
  onSkip: () => void
  evaluation: QuestionEvaluation | null
  submitting: boolean
  onNext: () => void
}) {
  const [answer, setAnswer] = useState("")
  const [idealExpanded, setIdealExpanded] = useState(false)
  const [followUpAnswer, setFollowUpAnswer] = useState("")
  const [showFollowup, setShowFollowup] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const question = session.questions[currentIndex]
  const total = session.questions.length

  useEffect(() => {
    setAnswer("")
    setIdealExpanded(false)
    setFollowUpAnswer("")
    setShowFollowup(false)
    setElapsed(0)
  }, [currentIndex])

  useEffect(() => {
    if (evaluation) return
    const timer = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(timer)
  }, [evaluation])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

  return (
    <div className="p-6 space-y-5 pb-10 max-w-3xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}
          >
            {session.company}
          </span>
          <span
            className="px-3 py-1 rounded-full text-xs"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--bg-border)" }}
          >
            {session.role}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
            Q {currentIndex + 1} of {total}
          </span>
          <div className="flex items-center gap-1 text-xs font-mono" style={{ color: "var(--accent-amber)" }}>
            <Clock style={{ width: 12, height: 12 }} />
            {formatTime(elapsed)}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1 animate-fade-up">
        {session.questions.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1.5 rounded-full transition-all duration-500"
            style={{
              background: i < currentIndex
                ? "var(--accent-mint)"
                : i === currentIndex
                  ? "var(--accent-mint)"
                  : "var(--bg-elevated)",
              boxShadow: i === currentIndex ? "0 0 8px rgba(0,229,160,0.5)" : "none",
              opacity: i === currentIndex ? 1 : i < currentIndex ? 0.8 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Question Card */}
      <div
        className="rounded-2xl p-7 space-y-5 animate-fade-up"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", boxShadow: "0 0 40px rgba(0,0,0,0.3)" }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
            style={{
              background: `${DIFFICULTY_COLORS[question.difficulty]}15`,
              color: DIFFICULTY_COLORS[question.difficulty],
              border: `1px solid ${DIFFICULTY_COLORS[question.difficulty]}30`,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {question.difficulty}
          </span>
          <span
            className="px-2.5 py-1 rounded-full text-xs"
            style={{ background: "var(--bg-elevated)", color: "var(--text-muted)", border: "1px solid var(--bg-border)" }}
          >
            {question.category}
          </span>
        </div>

        <h2
          className="leading-snug"
          style={{
            fontFamily: "Syne, sans-serif",
            fontWeight: 700,
            fontSize: 20,
            color: "var(--text-primary)",
          }}
        >
          {question.question}
        </h2>

        {!evaluation && (
          <div className="space-y-2">
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer here... Take your time."
              className="w-full resize-none rounded-xl px-4 py-3 text-sm transition-all duration-200"
              rows={6}
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--bg-border)",
                color: "var(--text-primary)",
                fontFamily: "DM Sans, sans-serif",
                outline: "none",
                minHeight: 120,
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(0,229,160,0.4)")}
              onBlur={e => (e.target.style.borderColor = "var(--bg-border)")}
            />
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
              <span>{estimateSpeakTime(answer)}</span>
              <span>{answer.length} chars</span>
            </div>
          </div>
        )}

        {!evaluation && (
          <div className="flex items-center gap-3">
            <button
              onClick={onSkip}
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                background: "transparent",
                color: "var(--text-muted)",
                border: "1px solid var(--bg-border)",
              }}
            >
              Skip
            </button>
            <button
              onClick={() => onSubmit(answer)}
              disabled={answer.trim().length < 10 || submitting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-150"
              style={{
                background: answer.trim().length >= 10 ? "var(--accent-mint)" : "var(--bg-elevated)",
                color: answer.trim().length >= 10 ? "var(--text-inverse)" : "var(--text-muted)",
                fontFamily: "Syne, sans-serif",
                cursor: answer.trim().length >= 10 ? "pointer" : "not-allowed",
              }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>Submit Answer <ArrowRight style={{ width: 14, height: 14 }} /></>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Evaluation Reveal */}
      {evaluation && (
        <div className="space-y-4 animate-fade-up">
          {/* Score + Verdict */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}
          >
            <div className="flex items-center gap-6 mb-5">
              <div className="text-center">
                <div
                  style={{
                    fontFamily: "Bebas Neue, sans-serif",
                    fontSize: 64,
                    lineHeight: 1,
                    color: VERDICT_COLORS[evaluation.verdict],
                    textShadow: `0 0 20px ${VERDICT_COLORS[evaluation.verdict]}60`,
                  }}
                >
                  {evaluation.score}
                </div>
                <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>/10</div>
              </div>
              <div>
                <div
                  className="px-4 py-1.5 rounded-full text-sm font-bold font-mono"
                  style={{
                    background: `${VERDICT_COLORS[evaluation.verdict]}15`,
                    color: VERDICT_COLORS[evaluation.verdict],
                    border: `1px solid ${VERDICT_COLORS[evaluation.verdict]}30`,
                  }}
                >
                  {evaluation.verdict}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* What worked */}
              <div
                className="rounded-xl p-4 space-y-1"
                style={{ background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.12)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 style={{ width: 14, height: 14, color: "var(--accent-mint)" }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-mint)" }}>What Worked</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}>
                  {evaluation.what_was_good}
                </p>
              </div>

              {/* What was missing */}
              <div
                className="rounded-xl p-4 space-y-1"
                style={{ background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.12)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <XCircle style={{ width: 14, height: 14, color: "var(--accent-rose)" }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--accent-rose)" }}>What Was Missing</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}>
                  {evaluation.what_was_missing}
                </p>
              </div>
            </div>

            {/* Ideal Answer — collapsible */}
            <button
              onClick={() => setIdealExpanded(e => !e)}
              className="w-full flex items-center gap-2 mt-4 py-2.5 px-4 rounded-lg text-sm transition-all"
              style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}
            >
              <span className="flex-1 text-left font-medium">Ideal answer</span>
              {idealExpanded ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
            </button>
            {idealExpanded && (
              <div
                className="mt-2 p-4 rounded-xl animate-fade-in"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--bg-border)" }}
              >
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}>
                  {evaluation.ideal_answer_summary}
                </p>
              </div>
            )}

            {/* Follow-up */}
            <div
              className="mt-4 p-4 rounded-xl flex items-start gap-3"
              style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}
            >
              <span className="text-lg">🎙</span>
              <div className="flex-1">
                <p className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: "var(--accent-purple)" }}>
                  Interviewer follow-up
                </p>
                <p className="text-sm italic" style={{ color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif" }}>
                  "{evaluation.follow_up_question}"
                </p>
                {!showFollowup && (
                  <button
                    onClick={() => setShowFollowup(true)}
                    className="mt-2 text-xs font-medium"
                    style={{ color: "var(--accent-purple)" }}
                  >
                    Answer this (bonus) →
                  </button>
                )}
                {showFollowup && (
                  <textarea
                    value={followUpAnswer}
                    onChange={e => setFollowUpAnswer(e.target.value)}
                    placeholder="Your follow-up answer..."
                    className="w-full mt-2 resize-none rounded-lg px-3 py-2 text-sm"
                    rows={3}
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--bg-border)",
                      color: "var(--text-primary)",
                      fontFamily: "DM Sans, sans-serif",
                      outline: "none",
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={onNext}
            className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all duration-150"
            style={{
              background: "var(--accent-mint)",
              color: "var(--text-inverse)",
              fontFamily: "Syne, sans-serif",
              boxShadow: "0 0 24px rgba(0,229,160,0.3)",
            }}
          >
            {currentIndex + 1 < session.questions.length ? (
              <>Next Question <ArrowRight style={{ width: 16, height: 16 }} /></>
            ) : (
              <>Complete Interview <Trophy style={{ width: 16, height: 16 }} /></>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Stage 2 — Report ───────────────────────────────────────────────────────

function AnimatedScore({ target }: { target: number }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    let current = 0
    const steps = 40
    const inc = target / steps
    const timer = setInterval(() => {
      current = Math.min(current + inc, target)
      setDisplay(Math.round(current))
      if (Math.round(current) >= target) clearInterval(timer)
    }, 600 / steps)
    return () => clearInterval(timer)
  }, [target])
  return <>{display}</>
}

function FinalReportScreen({
  report,
  session,
  evaluations,
  onRetake,
  onPracticeWeak,
}: {
  report: InterviewReport
  session: InterviewSession
  evaluations: Record<number, QuestionEvaluation>
  onRetake: () => void
  onPracticeWeak: () => void
}) {
  const gradeColor = GRADE_COLORS[report.performance_grade] || "var(--accent-mint)"

  return (
    <div className="p-6 space-y-6 pb-10 max-w-3xl mx-auto">
      <h1 className="animate-fade-up" style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 26, color: "var(--text-primary)" }}>
        Interview Report
      </h1>

      {/* Hero — score circle */}
      <div
        className="rounded-2xl p-8 flex flex-col items-center gap-4 animate-fade-up"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", textAlign: "center" }}
      >
        <div
          className="w-32 h-32 rounded-full flex items-center justify-center"
          style={{
            background: `conic-gradient(${gradeColor} 0% ${report.overall_score}%, var(--bg-elevated) ${report.overall_score}% 100%)`,
            padding: 4,
          }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center"
            style={{ background: "var(--bg-surface)" }}
          >
            <p style={{ fontFamily: "Bebas Neue, sans-serif", fontSize: 48, color: gradeColor, lineHeight: 1 }}>
              <AnimatedScore target={report.overall_score} />
            </p>
          </div>
        </div>

        <div>
          <div
            className="inline-flex px-4 py-1.5 rounded-full text-sm font-bold mb-2"
            style={{ background: `${gradeColor}15`, color: gradeColor, border: `1px solid ${gradeColor}30`, fontFamily: "Syne, sans-serif" }}
          >
            {report.performance_grade}
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {session.company} · {session.role}
          </p>
        </div>

        {/* Readiness gauge */}
        <div className="w-full max-w-sm">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
            <span>Interview Readiness</span>
            <span className="font-mono font-bold" style={{ color: gradeColor }}>{report.interview_readiness}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${report.interview_readiness}%`, background: gradeColor, boxShadow: `0 0 8px ${gradeColor}60` }}
            />
          </div>
        </div>
      </div>

      {/* 3 Insight cards */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up">
        {[
          { label: "Strongest Area", value: report.strongest_area, color: "var(--accent-mint)", icon: "💪" },
          { label: "Weakest Area",   value: report.weakest_area,   color: "var(--accent-rose)", icon: "⚠️" },
          { label: "Qs Answered",    value: `${Object.keys(evaluations).length}/${session.questions.length}`, color: "var(--accent-sky)", icon: "🎯" },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl p-4 text-center space-y-1"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)", borderTop: `2px solid ${card.color}` }}
          >
            <div style={{ fontSize: 20 }}>{card.icon}</div>
            <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "DM Sans, sans-serif" }}>{card.label}</div>
            <div className="text-sm font-semibold leading-snug" style={{ color: card.color, fontFamily: "Syne, sans-serif" }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Improvements */}
      <div className="rounded-2xl p-6 space-y-4 animate-fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <h3 className="font-syne font-semibold" style={{ color: "var(--text-primary)", fontSize: 16 }}>
          Top 3 Things to Work On
        </h3>
        {report.top_3_improvements.map((item, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
              style={{ background: "rgba(0,229,160,0.1)", color: "var(--accent-mint)", fontFamily: "Syne, sans-serif" }}
            >
              {i + 1}
            </div>
            <p className="text-sm leading-relaxed flex-1" style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}>
              {item}
            </p>
          </div>
        ))}
      </div>

      {/* Score Breakdown mini bar chart */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <h3 className="font-syne font-semibold mb-5" style={{ color: "var(--text-primary)", fontSize: 16 }}>
          Score Breakdown
        </h3>
        <div className="flex items-end gap-3 h-28">
          {session.questions.map((q, i) => {
            const ev = evaluations[q.id]
            const score = ev?.score ?? 0
            const height = score === 0 ? 4 : (score / 10) * 100
            const color = score >= 7 ? "var(--accent-mint)" : score >= 5 ? "var(--accent-amber)" : "var(--accent-rose)"
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <span className="text-xs font-mono font-bold" style={{ color }}>{ev ? score : "-"}</span>
                <div className="w-full rounded-t-md flex-1 flex items-end" style={{ background: "var(--bg-elevated)", minHeight: 4 }}>
                  <div
                    className="w-full rounded-t-md transition-all duration-700"
                    style={{ height: `${height}%`, background: color, boxShadow: `0 0 6px ${color}50`, minHeight: score > 0 ? 4 : 0 }}
                  />
                </div>
                <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Q{i + 1}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl p-6 animate-fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
        <h3 className="font-syne font-semibold mb-3" style={{ color: "var(--text-primary)", fontSize: 16 }}>AI Assessment</h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "DM Sans, sans-serif" }}>
          {report.summary}
        </p>
      </div>

      {/* CTAs */}
      <div className="flex gap-3 animate-fade-up">
        <button
          onClick={onRetake}
          className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150"
          style={{
            background: "transparent",
            color: "var(--text-secondary)",
            border: "1px solid var(--bg-border)",
            fontFamily: "Syne, sans-serif",
          }}
        >
          <RotateCcw style={{ width: 14, height: 14 }} />
          Retake Interview
        </button>
        <button
          onClick={onPracticeWeak}
          className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150"
          style={{
            background: "var(--accent-mint)",
            color: "var(--text-inverse)",
            fontFamily: "Syne, sans-serif",
            boxShadow: "0 0 20px rgba(0,229,160,0.3)",
          }}
        >
          Practice Weak Areas
          <ArrowRight style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  )
}

// ─── Stage 3 — History View ─────────────────────────────────────────────────

function HistoryView({ onBack }: { onBack: () => void }) {
  const [sessions, setSessions] = useState<InterviewSessionDetail[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { sessions: summaries } = await (calibrAPI as any).getInterviewHistory()
      // Load full detail for each
      const full: InterviewSessionDetail[] = []
      for (const s of summaries) {
        try {
          const detail = await (calibrAPI as any).getInterviewSession(s.session_id)
          full.push(detail)
        } catch {
          full.push({ ...s, questions: [], evaluations: {} } as any)
        }
      }
      setSessions(full)
      setLoading(false)
    })()
  }, [])

  const typeLabelMap: Record<string, string> = {
    technical: "Technical", behavioral: "Behavioral", product: "Product", hr: "HR",
  }

  return (
    <div className="p-6 space-y-5 pb-10">
      <div className="flex items-center gap-3 animate-fade-up">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: "var(--accent-mint)" }}
        >
          ← Back
        </button>
        <h1 style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 24, color: "var(--text-primary)" }}>
          Interview History
        </h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-16 rounded-xl skeleton" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--text-muted)" }}>
          <History style={{ width: 32, height: 32, margin: "0 auto 12px" }} />
          <p className="text-sm">No interview sessions yet. Start your first mock interview!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const report = s.final_report
            const gradeColor = report?.performance_grade ? GRADE_COLORS[report.performance_grade] : "var(--text-muted)"
            const isExpanded = expanded === s.session_id
            return (
              <div key={s.session_id} className="rounded-xl overflow-hidden animate-fade-up"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--bg-border)" }}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : s.session_id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-syne font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{s.company}</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>·</span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.role}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>
                        {typeLabelMap[s.interview_type] || s.interview_type}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>·</span>
                      <span className="text-[11px] font-mono" style={{ color: "var(--text-muted)" }}>{timeAgo(s.started_at)}</span>
                    </div>
                  </div>
                  {report && (
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm" style={{ color: gradeColor }}>{report.overall_score}/100</div>
                      <div className="text-[10px]" style={{ color: gradeColor }}>{report.performance_grade}</div>
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronUp style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronDown style={{ width: 14, height: 14, color: "var(--text-muted)" }} />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t animate-fade-in" style={{ borderColor: "var(--bg-border)" }}>
                    {s.questions.map((q, i) => {
                      const ev = s.evaluations[String(q.id)]
                      return (
                        <div key={q.id} className="space-y-1 pt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>Q{i + 1}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{
                                background: `${DIFFICULTY_COLORS[q.difficulty] || "var(--text-muted)"}15`,
                                color: DIFFICULTY_COLORS[q.difficulty] || "var(--text-muted)",
                              }}
                            >
                              {q.difficulty}
                            </span>
                          </div>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{q.question}</p>
                          {ev ? (
                            <div className="pl-3 border-l-2 space-y-1" style={{ borderColor: VERDICT_COLORS[ev.verdict] || "var(--bg-border)" }}>
                              <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                                "{ev.answer.slice(0, 120)}{ev.answer.length > 120 ? "…" : ""}"
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold" style={{ color: VERDICT_COLORS[ev.verdict] }}>
                                  {ev.score}/10 · {ev.verdict}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>— Skipped</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function InterviewSimulatorTab() {
  const { toast } = useToast()
  const [stage, setStage] = useState<"setup" | "question" | "report" | "history">("setup")
  const [apps, setApps] = useState<Application[]>([])
  const [history, setHistory] = useState<InterviewSessionSummary[]>([])
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [evaluations, setEvaluations] = useState<Record<number, QuestionEvaluation>>({})
  const [report, setReport] = useState<InterviewReport | null>(null)
  const [starting, setStarting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const currentEval = session ? evaluations[session.questions[currentIdx]?.id] ?? null : null

  useEffect(() => {
    document.title = "Interview Simulator — CALIBR"
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [appsRes, histRes] = await Promise.all([
        calibrAPI.getApplications(),
        (calibrAPI as any).getInterviewHistory(),
      ])
      setApps(appsRes.applications)
      setHistory(histRes.sessions)
    } catch (e: any) {
      toast("error", e.message || "Failed to load data")
    }
  }

  const handleStart = useCallback(async (appId: string, type: InterviewType) => {
    setStarting(true)
    try {
      const sess = await (calibrAPI as any).startInterview(appId, type)
      setSession(sess)
      setCurrentIdx(0)
      setEvaluations({})
      setReport(null)
      setStage("question")
      toast("success", `Interview started — ${sess.company} ${sess.role}`)
    } catch (e: any) {
      toast("error", e.message || "Failed to start interview")
    } finally {
      setStarting(false)
    }
  }, [toast])

  const handleSubmit = useCallback(async (answer: string) => {
    if (!session) return
    const q = session.questions[currentIdx]
    setSubmitting(true)
    try {
      const ev = await (calibrAPI as any).evaluateAnswer(session.session_id, q.id, answer)
      setEvaluations(prev => ({ ...prev, [q.id]: ev }))
    } catch (e: any) {
      toast("error", e.message || "Evaluation failed")
    } finally {
      setSubmitting(false)
    }
  }, [session, currentIdx, toast])

  const handleSkip = useCallback(() => {
    if (!session) return
    if (currentIdx + 1 < session.questions.length) {
      setCurrentIdx(i => i + 1)
    } else {
      handleComplete()
    }
  }, [session, currentIdx])

  const handleNext = useCallback(() => {
    if (!session) return
    if (currentIdx + 1 < session.questions.length) {
      setCurrentIdx(i => i + 1)
    } else {
      handleComplete()
    }
  }, [session, currentIdx])

  const handleComplete = useCallback(async () => {
    if (!session) return
    try {
      const r = await (calibrAPI as any).completeInterview(session.session_id)
      setReport(r)
      setStage("report")
      toast("success", `Interview complete — Score: ${r.overall_score}/100`)
    } catch (e: any) {
      toast("error", e.message || "Failed to generate report")
    }
  }, [session, toast])

  const handleRetake = useCallback(() => {
    setSession(null)
    setEvaluations({})
    setReport(null)
    setCurrentIdx(0)
    setStage("setup")
    loadData()
  }, [])

  if (stage === "history") {
    return <HistoryView onBack={() => setStage("setup")} />
  }

  if (stage === "setup" || !session) {
    return (
      <SetupScreen
        apps={apps}
        history={history}
        onStart={handleStart}
        onShowHistory={() => setStage("history")}
        loading={starting}
      />
    )
  }

  if (stage === "question") {
    return (
      <QuestionScreen
        session={session}
        currentIndex={currentIdx}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
        evaluation={currentEval}
        submitting={submitting}
        onNext={handleNext}
      />
    )
  }

  if (stage === "report" && report) {
    return (
      <FinalReportScreen
        report={report}
        session={session}
        evaluations={evaluations}
        onRetake={handleRetake}
        onPracticeWeak={handleRetake}
      />
    )
  }

  return null
}
