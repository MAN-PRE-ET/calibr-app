/**
 * CALIBR API Client
 * Typed wrappers for all backend endpoints.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE as string) || "http://localhost:8000"
export const API_BASE = BASE_URL

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      signal: controller.signal,
      ...options,
    })
    if (!res.ok) {
      let msg = `API error ${res.status}`
      try {
        const err = await res.json()
        msg = err.detail || err.message || msg
      } catch {}
      throw new Error(msg)
    }
    return res.json()
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Request timed out — the backend may be waking up. Please try again.')
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

/** Silently warm up the Render backend (free tier spins down after inactivity). */
export async function warmUp(): Promise<void> {
  try {
    await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(30_000) })
  } catch {
    // silent — best-effort wake-up
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CandidateProfile {
  name: string
  raw_resume_text: string
  skills: string[]
  tools: string[]
  projects: string[]
  experience_years: number
  domains: string[]
  education: string
}

export interface ProfileUploadResult {
  status: string
  profile: CandidateProfile
  skill_confidence: Record<string, number>
  extracted_text: string
}

export interface JobAnalysisResult {
  application_id: string
  skill_match_score: number
  skill_match_percentage: number
  interview_probability: number
  strong_match: string[]
  moderate_match: string[]
  missing_skills: string[]
  required_skills: string[]
  preferred_skills: string[]
  experience_level: string
  responsibilities: string[]
  reasoning: string
  // legacy aliases
  strong_matches: string[]
  moderate_matches: string[]
  jd_analysis: {
    required_skills: string[]
    preferred_skills: string[]
    tools: string[]
    experience_level: string
    responsibilities: string[]
  }
}

export interface ScrapeJobResult {
  status: string
  company: string
  role: string
  jd_text: string
}

export interface Application {
  id: string
  company: string
  role: string
  jd_text: string
  status: "Submitted" | "In Review" | "Interview" | "Offer" | "Rejected"
  skill_match_score: number
  interview_probability: number
  strong_skills: string[]
  moderate_skills: string[]
  missing_skills: string[]
  date_applied: string
  notes: string
}

export interface RejectionAnalysisResult {
  rejection_id: string
  identified_gaps: string[]
  skill_confidence_impact: Record<string, number>
  updated_skill_confidence: Record<string, number>
  learning_suggestions: Array<{
    skill: string
    resource_type: string
    hours: number
  }>
  summary: string
  // legacy
  detected_skill_gaps: string[]
  learning_topics: string[]
}

export interface CareerAnalysisResult {
  status: string
  message?: string
  top_recurring_gaps: string[]
  gap_frequencies: Record<string, number>
  strongest_domain: string
  strategy_score: number
  learning_roadmap: Array<{
    step: number
    skill: string
    resource_type: string
    hours: number
    description: string
  }>
  career_trajectory_insight: string
  // legacy
  recurring_skill_gaps: Record<string, number>
  summary: string
  knowledge_domains: Array<{ name: string; description: string }>
}

export interface DashboardMetrics {
  total_applications: number
  avg_skill_match: number
  avg_interview_probability: number
  interview_rate: number
  rejection_count: number
  top_missing_skill: string
  recent_activity: Array<{
    type: string
    text: string
    timestamp: string
  }>
  applications_by_status: Record<
    string,
    Array<{ id: string; company: string; role: string; match_score: number; date: string }>
  >
  skill_confidence: Record<string, number>
  has_profile: boolean
}

export interface ResumeGenerateResult {
  status: string
  download_url: string
  ats_score?: number
  human_score?: number
  keywords_matched?: string
  preview: {
    summary: string
    highlighted_skills: string[]
    selected_projects: string[]
  }
}

export interface ProfileState {
  skill_confidence: Record<string, number>
  last_updated: string
  has_profile: boolean
  profile_name: string
  skills_count: number
}

// ─── API Object ───────────────────────────────────────────────────────────────

export const calibrAPI = {
  /** Upload resume file — extract profile via Groq */
  uploadResume: (file: File): Promise<ProfileUploadResult> => {
    const form = new FormData()
    form.append("file", file)
    return fetch(`${API_BASE}/api/profile/upload`, { method: "POST", body: form })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.detail || `Upload failed (${res.status})`)
        }
        return res.json()
      })
  },

  /** Scrape a job posting URL to extract the job description */
  scrapeJobUrl: (url: string): Promise<ScrapeJobResult> =>
    apiFetch("/api/jobs/scrape", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  /** Analyze a job description against the candidate profile */
  analyzeJob: (payload: {
    jd_text: string
    company?: string
    role?: string
    application_id?: string
  }): Promise<JobAnalysisResult> =>
    apiFetch("/api/analyze/job", { method: "POST", body: JSON.stringify(payload) }),

  /** Get all applications */
  getApplications: (): Promise<{ applications: Application[] }> =>
    apiFetch("/api/applications"),

  /** Update application status (drag-and-drop) */
  updateAppStatus: (id: string, status: string): Promise<{ application: Application }> =>
    apiFetch(`/api/applications/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  /** Analyze a rejection and get skill confidence drops */
  analyzeRejection: (
    application_id: string,
    user_notes: string
  ): Promise<RejectionAnalysisResult> =>
    apiFetch("/api/rejections/analyze", {
      method: "POST",
      body: JSON.stringify({ application_id, user_notes }),
    }),

  /** Get aggregated career analysis from all rejections */
  getCareerAnalysis: (): Promise<CareerAnalysisResult> =>
    apiFetch("/api/analysis/career"),

  /** Get dashboard KPIs and activity feed */
  getDashboardMetrics: (): Promise<DashboardMetrics> =>
    apiFetch("/api/dashboard/metrics"),

  /** Get current skill confidence state */
  getProfileState: (): Promise<ProfileState> =>
    apiFetch("/api/profile/state"),

  /** Generate tailored resume PDF for an application */
  generateResume: (application_id: string): Promise<ResumeGenerateResult> =>
    apiFetch("/api/resume/generate", {
      method: "POST",
      body: JSON.stringify({ application_id }),
    }),

  /**
   * Chat with CALIBR Agent — returns a ReadableStream for token streaming.
   * Usage: for await (const chunk of calibrAPI.chatWithAgent(...)) { ... }
   */
  chatWithAgent: async function* (
    message: string,
    context: Record<string, unknown> = {}
  ): AsyncGenerator<string> {
    const res = await fetch(`${API_BASE}/api/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    })
    if (!res.ok || !res.body) {
      throw new Error(`Agent chat failed (${res.status})`)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      yield decoder.decode(value, { stream: true })
    }
  },
}

/** Skill confidence to color mapping */
export function skillColor(confidence: number): string {
  if (confidence >= 75) return "var(--accent-mint)"
  if (confidence >= 55) return "var(--accent-amber)"
  return "var(--accent-rose)"
}

/** Relative timestamp */
export function timeAgo(iso: string): string {
  if (!iso) return ""
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── Interview Simulator Types ─────────────────────────────────────────────

export type InterviewType = "technical" | "behavioral" | "product" | "hr"
export type Difficulty = "easy" | "medium" | "hard"
export type Verdict = "Strong" | "Good" | "Needs Work" | "Weak"
export type PerformanceGrade = "Excellent" | "Good" | "Average" | "Needs Work"

export interface InterviewQuestion {
  id: number
  question: string
  difficulty: Difficulty
  category: string
}

export interface InterviewSession {
  session_id: string
  company: string
  role: string
  interview_type: InterviewType
  questions: InterviewQuestion[]
}

export interface QuestionEvaluation {
  score: number
  verdict: Verdict
  what_was_good: string
  what_was_missing: string
  ideal_answer_summary: string
  follow_up_question: string
  question_id: number
  answer: string
}

export interface InterviewReport {
  overall_score: number
  performance_grade: PerformanceGrade
  strongest_area: string
  weakest_area: string
  top_3_improvements: string[]
  interview_readiness: number
  summary: string
}

export interface InterviewSessionSummary {
  session_id: string
  application_id: string
  company: string
  role: string
  interview_type: InterviewType
  status: "active" | "completed"
  overall_score?: number
  performance_grade?: PerformanceGrade
  questions_answered: number
  total_questions: number
  started_at: string
  completed_at?: string
}

export interface InterviewSessionDetail {
  session_id: string
  application_id: string
  company: string
  role: string
  interview_type: InterviewType
  questions: Array<InterviewQuestion & { ideal_answer_hints?: string[] }>
  evaluations: Record<string, QuestionEvaluation & { answer: string }>
  status: string
  started_at: string
  completed_at?: string
  final_report?: InterviewReport
}

// ─── Extended API Object ───────────────────────────────────────────────────

Object.assign(calibrAPI, {
  startInterview: (application_id: string, interview_type: InterviewType): Promise<InterviewSession> =>
    apiFetch("/api/interview/start", {
      method: "POST",
      body: JSON.stringify({ application_id, interview_type }),
    }),

  evaluateAnswer: (
    session_id: string,
    question_id: number,
    answer: string
  ): Promise<QuestionEvaluation> =>
    apiFetch("/api/interview/evaluate", {
      method: "POST",
      body: JSON.stringify({ session_id, question_id, answer }),
    }),

  completeInterview: (session_id: string): Promise<InterviewReport> =>
    apiFetch("/api/interview/complete", {
      method: "POST",
      body: JSON.stringify({ session_id }),
    }),

  getInterviewHistory: (): Promise<{ sessions: InterviewSessionSummary[] }> =>
    apiFetch("/api/interview/history"),

  getInterviewSession: (session_id: string): Promise<InterviewSessionDetail> =>
    apiFetch(`/api/interview/session/${session_id}`),

  seedDemo: (): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/demo/seed", { method: "POST" }),

  resetDemo: (): Promise<{ success: boolean; message: string }> =>
    apiFetch("/api/demo/reset", { method: "POST" }),
})

// Type-extend calibrAPI so TypeScript knows about the new methods
declare module "./api" {
  interface CalibRAPI {
    scrapeJobUrl(url: string): Promise<ScrapeJobResult>
    startInterview(application_id: string, interview_type: InterviewType): Promise<InterviewSession>
    evaluateAnswer(session_id: string, question_id: number, answer: string): Promise<QuestionEvaluation>
    completeInterview(session_id: string): Promise<InterviewReport>
    getInterviewHistory(): Promise<{ sessions: InterviewSessionSummary[] }>
    getInterviewSession(session_id: string): Promise<InterviewSessionDetail>
    seedDemo(): Promise<{ success: boolean; message: string }>
    resetDemo(): Promise<{ success: boolean; message: string }>
  }
}
