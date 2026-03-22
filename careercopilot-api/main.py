"""
CALIBR Backend — Full AI Brain
Powered by Groq LLaMA 3.3 70B + FastAPI
"""
import os
import io
import re
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

import pdfplumber
import docx
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from groq import Groq
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from sentence_transformers import SentenceTransformer, util

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("calibr")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DATA_FILE = os.getenv("DATA_FILE", "calibr_data.json")
GROQ_MODEL = "llama-3.3-70b-versatile"

groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
embed_model = SentenceTransformer("all-MiniLM-L6-v2")

app = FastAPI(title="CALIBR AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "https://calibr-app.vercel.app",
        "https://*.vercel.app",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("resumes", exist_ok=True)
app.mount("/resumes", StaticFiles(directory="resumes"), name="resumes")

# ─────────────────────────────────────────────────────────────────────────────
# DATA STORE
# ─────────────────────────────────────────────────────────────────────────────
EMPTY_SCHEMA = {
    "candidate_profile": {
        "name": "",
        "raw_resume_text": "",
        "skills": [],
        "tools": [],
        "projects": [],
        "experience_years": 0,
        "domains": [],
        "education": "",
    },
    "current_profile_state": {
        "skill_confidence": {},
        "last_updated": "",
    },
    "applications": [],
    "rejections": [],
    "analysis_history": [],
    "interview_sessions": [],
}


def load_data() -> dict:
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                data = json.load(f)
            # Ensure new keys exist for backward compat
            for k, v in EMPTY_SCHEMA.items():
                if k not in data:
                    data[k] = v
            return data
        except Exception:
            pass
    return json.loads(json.dumps(EMPTY_SCHEMA))


def save_data(data: dict):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# UTILITIES
# ─────────────────────────────────────────────────────────────────────────────
SKILL_NORM: dict[str, str] = {
    "ml": "Machine Learning",
    "ai": "Artificial Intelligence",
    "nlp": "NLP",
    "natural language processing": "NLP",
    "tf": "TensorFlow",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "torch": "PyTorch",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node": "Node.js",
    "sql": "SQL",
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "mongo": "MongoDB",
    "mongodb": "MongoDB",
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "GCP",
    "google cloud": "GCP",
    "docker": "Docker",
    "git": "Git",
    "github": "Git",
    "python": "Python",
    "c++": "C++",
    "cpp": "C++",
    "java": "Java",
    "go": "Go",
    "golang": "Go",
    "redis": "Redis",
    "system design": "System Design",
    "data structures": "Data Structures",
    "algorithms": "Algorithms",
    "deep learning": "Deep Learning",
    "llm": "LLMs",
    "large language models": "LLMs",
    "rag": "RAG",
    "graphql": "GraphQL",
    "rest": "REST APIs",
    "rest api": "REST APIs",
    "restful": "REST APIs",
    "ci/cd": "CI/CD",
    "devops": "DevOps",
    "agile": "Agile",
    "scrum": "Scrum",
}


def normalize_skill(skill: str) -> str:
    low = skill.strip().lower()
    return SKILL_NORM.get(low, skill.strip().title())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_text(content: bytes, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    try:
        if ext == "pdf":
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                return "\n".join(p.extract_text() or "" for p in pdf.pages)
        elif ext == "docx":
            doc = docx.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        elif ext == "txt":
            return content.decode("utf-8", errors="replace")
    except Exception as e:
        logger.error(f"Text extraction failed: {e}")
    return ""


def call_groq(prompt: str, system: str = "", temperature: float = 0.2) -> str:
    """Call Groq and return raw text. Raises if no client."""
    if not groq_client:
        raise RuntimeError("GROQ_API_KEY is not set. Please add it to the .env file.")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    response = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=temperature,
        max_tokens=2048,
    )
    return response.choices[0].message.content or ""


def parse_groq_json(raw: str) -> dict:
    """Strip markdown fences and parse JSON. Returns error dict on failure."""
    clean = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    # Find first { or [ and last } or ]
    start = min(
        (clean.find("{") if clean.find("{") != -1 else len(clean)),
        (clean.find("[") if clean.find("[") != -1 else len(clean)),
    )
    end = max(clean.rfind("}"), clean.rfind("]"))
    if start < end:
        clean = clean[start : end + 1]
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        logger.error(f"JSON parse failed. Raw: {raw[:300]}")
        return {"error": "AI response malformed", "raw": raw[:500]}


def init_skill_confidence(skills: list[str], tools: list[str]) -> dict[str, int]:
    """Initialise all skills at confidence 75 (default)."""
    conf: dict[str, int] = {}
    for s in skills + tools:
        nm = normalize_skill(s)
        if nm not in conf:
            conf[nm] = 75
    return conf


def apply_confidence_impact(current: dict[str, int], impact: dict[str, float]) -> dict[str, int]:
    updated = dict(current)
    for skill, delta in impact.items():
        nm = normalize_skill(skill)
        if nm in updated:
            updated[nm] = max(10, min(100, int(updated[nm] + delta)))
    return updated


# ─────────────────────────────────────────────────────────────────────────────
# REQUEST MODELS
# ─────────────────────────────────────────────────────────────────────────────
class AnalyzeJobRequest(BaseModel):
    jd_text: str
    company: str = ""
    role: str = ""
    application_id: Optional[str] = None


class UpdateStatusRequest(BaseModel):
    status: str


class AnalyzeRejectionRequest(BaseModel):
    application_id: str
    user_notes: str


class ChatRequest(BaseModel):
    message: str
    context: dict = {}


class GenerateResumeRequest(BaseModel):
    application_id: str


class InterviewStartRequest(BaseModel):
    application_id: str
    interview_type: str  # "technical" | "behavioral" | "product" | "hr"


class InterviewEvaluateRequest(BaseModel):
    session_id: str
    question_id: int
    answer: str


class InterviewCompleteRequest(BaseModel):
    session_id: str


# Legacy models kept for backward compat
class LegacyJDRequest(BaseModel):
    job_description: str


class LegacyRejectionRequest(BaseModel):
    application_id: int
    rejection_notes: str


class LegacyPredictRequest(BaseModel):
    candidate_profile: dict
    jd_analysis: dict
    skill_match_score: int


class LegacyGenerateResumeRequest(BaseModel):
    company: str
    job_role: str
    skill_match: int


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS — Health
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "CALIBR AI Backend — Running"}


# ───────────────────────────────────────────────────────────────────────────────
# GET /health
# ───────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Health check endpoint — used by UptimeRobot and keep_alive.py to prevent spin-down."""
    return {"status": "ok", "version": "1.0.0", "app": "CALIBR"}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/profile/upload
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/profile/upload")
async def upload_profile(file: UploadFile = File(...)):
    content = await file.read()
    text = extract_text(content, file.filename or "resume.txt")
    if not text.strip():
        raise HTTPException(400, "Could not extract text from file.")

    prompt = f"""Extract structured information from this resume text.

RESUME:
{text[:6000]}

Return ONLY valid JSON with exactly these keys:
{{
  "name": "full name or empty string",
  "skills": ["list of technical skills"],
  "tools": ["list of tools and technologies"],
  "projects": ["list of project names or descriptions"],
  "experience_years": <integer number>,
  "domains": ["list of domain areas, e.g. Machine Learning, Web Development"],
  "education": "highest degree and institution"
}}

Normalize abbreviations: ML→Machine Learning, k8s→Kubernetes, JS→JavaScript.
Do NOT invent skills not present in the resume.
Return ONLY valid JSON. No markdown, no backticks, no explanation."""

    raw = call_groq(prompt)
    profile = parse_groq_json(raw)

    if "error" in profile:
        raise HTTPException(500, f"AI extraction failed: {profile.get('raw', '')[:200]}")

    # Normalize skills
    profile["skills"] = [normalize_skill(s) for s in profile.get("skills", [])]
    profile["tools"] = [normalize_skill(t) for t in profile.get("tools", [])]
    profile["raw_resume_text"] = text[:8000]

    data = load_data()
    data["candidate_profile"] = profile

    # Initialize or extend skill confidence
    existing_conf = data["current_profile_state"].get("skill_confidence", {})
    new_conf = init_skill_confidence(profile["skills"], profile["tools"])
    merged = {**new_conf, **existing_conf}  # existing confidence preserved
    data["current_profile_state"]["skill_confidence"] = merged
    data["current_profile_state"]["last_updated"] = now_iso()

    save_data(data)

    return {
        "status": "success",
        "profile": profile,
        "skill_confidence": merged,
        "extracted_text": text[:1500] + ("..." if len(text) > 1500 else ""),
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/analyze/job
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/analyze/job")
async def analyze_job(req: AnalyzeJobRequest):
    data = load_data()
    profile = data["candidate_profile"]

    if not profile.get("skills") and not profile.get("raw_resume_text"):
        return {"error": "no_profile", "message": "Please upload your resume first."}

    profile_summary = {
        "name": profile.get("name"),
        "skills": profile.get("skills", []),
        "tools": profile.get("tools", []),
        "projects": profile.get("projects", []),
        "experience_years": profile.get("experience_years", 0),
        "domains": profile.get("domains", []),
        "education": profile.get("education", ""),
    }

    prompt = f"""You are a senior technical recruiter. Analyze the fit between this candidate and job description.

CANDIDATE PROFILE:
{json.dumps(profile_summary, indent=2)}

JOB DESCRIPTION:
{req.jd_text[:4000]}

Return ONLY valid JSON with exactly these keys:
{{
  "required_skills": ["skills explicitly required in JD"],
  "preferred_skills": ["skills listed as nice-to-have"],
  "strong_match": ["candidate skills matching JD at >=75% relevance"],
  "moderate_match": ["candidate skills matching JD at 55-74% relevance"],
  "missing_skills": ["JD required skills the candidate lacks"],
  "skill_match_score": <integer 0-100>,
  "interview_probability": <integer 0-100>,
  "experience_level": "experience requirement from JD or Not specified",
  "responsibilities": ["up to 5 key responsibilities from JD"],
  "reasoning": "2 sentence explanation of the assessment"
}}

Rules:
- Only include skills that literally appear in the JD or candidate profile
- skill_match_score = (strong_match*1.0 + moderate_match*0.5) / required_skills * 100
- interview_probability factors in skill match, experience gap, and domain alignment
- Do NOT invent skills or companies not in the provided text.
Return ONLY valid JSON. No markdown, no backticks, no explanation."""

    raw = call_groq(prompt)
    result = parse_groq_json(raw)

    if "error" in result:
        raise HTTPException(500, f"AI analysis failed: {result.get('raw', '')[:200]}")

    # Normalize skill lists
    for key in ("required_skills", "preferred_skills", "strong_match", "moderate_match", "missing_skills"):
        result[key] = [normalize_skill(s) for s in result.get(key, [])]

    # Save application
    app_id = req.application_id or str(uuid.uuid4())
    application = {
        "id": app_id,
        "company": req.company or "Unknown Company",
        "role": req.role or "Unknown Role",
        "jd_text": req.jd_text[:2000],
        "status": "Submitted",
        "skill_match_score": result.get("skill_match_score", 0),
        "interview_probability": result.get("interview_probability", 0),
        "strong_skills": result.get("strong_match", []),
        "moderate_skills": result.get("moderate_match", []),
        "missing_skills": result.get("missing_skills", []),
        "required_skills": result.get("required_skills", []),
        "preferred_skills": result.get("preferred_skills", []),
        "responsibilities": result.get("responsibilities", []),
        "experience_level": result.get("experience_level", ""),
        "date_applied": now_iso(),
        "notes": "",
    }

    apps = data["applications"]
    existing_idx = next((i for i, a in enumerate(apps) if a["id"] == app_id), None)
    if existing_idx is not None:
        apps[existing_idx] = application
    else:
        apps.insert(0, application)

    # Log to analysis_history
    data["analysis_history"].insert(0, {
        "type": "job_analysis",
        "text": f"Analyzed {req.role or 'role'} at {req.company or 'company'}",
        "timestamp": now_iso(),
        "application_id": app_id,
    })

    save_data(data)

    return {
        "application_id": app_id,
        "skill_match_score": result.get("skill_match_score", 0),
        "interview_probability": result.get("interview_probability", 0),
        "strong_match": result.get("strong_match", []),
        "moderate_match": result.get("moderate_match", []),
        "missing_skills": result.get("missing_skills", []),
        "required_skills": result.get("required_skills", []),
        "preferred_skills": result.get("preferred_skills", []),
        "experience_level": result.get("experience_level", ""),
        "responsibilities": result.get("responsibilities", []),
        "reasoning": result.get("reasoning", ""),
        # Legacy field names used by old frontend
        "skill_match_percentage": result.get("skill_match_score", 0),
        "strong_matches": result.get("strong_match", []),
        "moderate_matches": result.get("moderate_match", []),
        "jd_analysis": {
            "required_skills": result.get("required_skills", []),
            "preferred_skills": result.get("preferred_skills", []),
            "tools": result.get("required_skills", []),
            "experience_level": result.get("experience_level", ""),
            "responsibilities": result.get("responsibilities", []),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/applications
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/applications")
def get_applications():
    data = load_data()
    return {"applications": data["applications"]}


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /api/applications/{id}/status
# ─────────────────────────────────────────────────────────────────────────────
VALID_STATUSES = {"Submitted", "In Review", "Interview", "Offer", "Rejected"}


@app.patch("/api/applications/{app_id}/status")
def update_status(app_id: str, req: UpdateStatusRequest):
    if req.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}")

    data = load_data()
    apps = data["applications"]
    app_rec = next((a for a in apps if a["id"] == app_id), None)
    if not app_rec:
        raise HTTPException(404, f"Application {app_id} not found")

    prev_status = app_rec["status"]
    app_rec["status"] = req.status

    # Log activity
    data["analysis_history"].insert(0, {
        "type": "status_change",
        "text": f"{app_rec['company']} moved from {prev_status} → {req.status}",
        "timestamp": now_iso(),
        "application_id": app_id,
    })

    save_data(data)
    return {"application": app_rec}


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/rejections/analyze
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/rejections/analyze")
def analyze_rejection(req: AnalyzeRejectionRequest):
    data = load_data()
    profile = data["candidate_profile"]
    skill_confidence = data["current_profile_state"].get("skill_confidence", {})

    # Look up the application
    app_rec = next((a for a in data["applications"] if a["id"] == req.application_id), None)
    company = app_rec["company"] if app_rec else "Unknown Company"
    role = app_rec["role"] if app_rec else "Unknown Role"

    # Mark as rejected
    if app_rec:
        app_rec["status"] = "Rejected"

    prompt = f"""A candidate was rejected from {company} for the {role} role.

Candidate's rejection feedback / interview notes:
{req.user_notes}

Candidate's current skills: {json.dumps(profile.get('skills', []) + profile.get('tools', []))}

Analyze the rejection and return ONLY valid JSON:
{{
  "identified_gaps": ["specific skills or areas that contributed to rejection"],
  "skill_confidence_impact": {{"SkillName": -10}},
  "learning_suggestions": [
    {{"skill": "skill name", "resource_type": "course/book/project", "hours": 20}}
  ],
  "summary": "one sentence summary of why they were rejected and what to fix"
}}

Rules:
- skill_confidence_impact values must be negative numbers (reduction)
- Only reduce confidence for skills clearly mentioned or implied in the notes
- Do not invent skills not mentioned in the notes or candidate profile
- hours should be realistic (5-80 range)
Return ONLY valid JSON. No markdown, no backticks, no explanation."""

    raw = call_groq(prompt)
    result = parse_groq_json(raw)

    if "error" in result:
        raise HTTPException(500, f"AI analysis failed: {result.get('raw', '')[:200]}")

    # Apply confidence impact
    impact = {normalize_skill(k): v for k, v in result.get("skill_confidence_impact", {}).items()}
    updated_confidence = apply_confidence_impact(skill_confidence, impact)
    data["current_profile_state"]["skill_confidence"] = updated_confidence
    data["current_profile_state"]["last_updated"] = now_iso()

    # Normalize gaps
    gaps = [normalize_skill(g) for g in result.get("identified_gaps", [])]

    rejection_id = str(uuid.uuid4())
    rejection_rec = {
        "id": rejection_id,
        "application_id": req.application_id,
        "company": company,
        "role": role,
        "user_notes": req.user_notes,
        "identified_gaps": gaps,
        "skill_confidence_impact": impact,
        "learning_suggestions": result.get("learning_suggestions", []),
        "summary": result.get("summary", ""),
        "analyzed_at": now_iso(),
    }
    data["rejections"].insert(0, rejection_rec)

    # Log activity
    data["analysis_history"].insert(0, {
        "type": "rejection_analysis",
        "text": f"Rejection from {company} analyzed — {len(gaps)} gaps found",
        "timestamp": now_iso(),
        "application_id": req.application_id,
    })

    save_data(data)

    return {
        "rejection_id": rejection_id,
        "identified_gaps": gaps,
        "skill_confidence_impact": impact,
        "updated_skill_confidence": updated_confidence,
        "learning_suggestions": result.get("learning_suggestions", []),
        "summary": result.get("summary", ""),
        # Legacy field compatibility
        "detected_skill_gaps": gaps,
        "learning_topics": [s["skill"] for s in result.get("learning_suggestions", [])],
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/analysis/career
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/analysis/career")
def career_analysis():
    data = load_data()
    rejections = data["rejections"]
    applications = data["applications"]

    if len(rejections) < 2:
        return {
            "status": "insufficient_data",
            "message": "Analyze at least 2 rejections to unlock career intelligence patterns.",
            "top_recurring_gaps": [],
            "strongest_domain": "",
            "strategy_score": 0,
            "learning_roadmap": [],
            "career_trajectory_insight": "",
            # Legacy fields
            "recurring_skill_gaps": {},
            "knowledge_domains": [],
            "summary": "",
        }

    rejections_summary = [
        {
            "company": r["company"],
            "role": r["role"],
            "gaps": r["identified_gaps"],
            "summary": r["summary"],
        }
        for r in rejections[:10]
    ]
    apps_summary = [
        {
            "company": a["company"],
            "role": a["role"],
            "status": a["status"],
            "match_score": a["skill_match_score"],
        }
        for a in applications[:15]
    ]

    prompt = f"""Analyze this candidate's job search patterns.

REJECTION HISTORY:
{json.dumps(rejections_summary, indent=2)}

APPLICATION HISTORY:
{json.dumps(apps_summary, indent=2)}

Return ONLY valid JSON:
{{
  "top_recurring_gaps": ["top 3-5 skills that appear most in rejections"],
  "gap_frequencies": {{"SkillName": <count>}},
  "strongest_domain": "the candidate's strongest area based on their history",
  "strategy_score": <integer 0-100 representing overall career readiness>,
  "learning_roadmap": [
    {{"step": 1, "skill": "skill name", "resource_type": "course/project/book", "hours": 20, "description": "short description"}}
  ],
  "career_trajectory_insight": "2-3 sentence insight about their career trajectory and what to do next"
}}

Be realistic and specific. Base analysis only on provided data.
Return ONLY valid JSON. No markdown, no backticks, no explanation."""

    raw = call_groq(prompt)
    result = parse_groq_json(raw)

    if "error" in result:
        raise HTTPException(500, f"AI analysis failed: {result.get('raw', '')[:200]}")

    # Build legacy recurring_skill_gaps from gap_frequencies
    gap_freq = result.get("gap_frequencies", {})
    if not gap_freq:
        # Fall back: count from rejections
        from collections import Counter
        all_gaps_flat = [g for r in rejections for g in r.get("identified_gaps", [])]
        gap_freq = dict(Counter(all_gaps_flat))

    return {
        "status": "success",
        "top_recurring_gaps": result.get("top_recurring_gaps", []),
        "gap_frequencies": gap_freq,
        "strongest_domain": result.get("strongest_domain", ""),
        "strategy_score": result.get("strategy_score", 50),
        "learning_roadmap": result.get("learning_roadmap", []),
        "career_trajectory_insight": result.get("career_trajectory_insight", ""),
        # Legacy fields
        "recurring_skill_gaps": gap_freq,
        "summary": result.get("career_trajectory_insight", ""),
        "knowledge_domains": [{"name": result.get("strongest_domain", ""), "description": ""}],
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/dashboard/metrics
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/dashboard/metrics")
def dashboard_metrics():
    data = load_data()
    apps = data["applications"]
    rejections = data["rejections"]
    history = data["analysis_history"]

    total = len(apps)
    interviews = len([a for a in apps if a["status"] in ("Interview", "Offer")])
    rejected = len([a for a in apps if a["status"] == "Rejected"])
    interview_rate = round((interviews / total * 100) if total > 0 else 0, 1)

    avg_match = (
        round(sum(a.get("skill_match_score", 0) for a in apps) / total, 1)
        if total > 0 else 0
    )

    # Compute avg interview probability
    avg_prob = (
        round(sum(a.get("interview_probability", 0) for a in apps) / total, 1)
        if total > 0 else 0
    )

    # Top missing skill across all apps
    from collections import Counter
    all_missing = [s for a in apps for s in a.get("missing_skills", [])]
    top_missing = Counter(all_missing).most_common(1)
    top_missing_skill = top_missing[0][0] if top_missing else "N/A"

    # Recent activity — build from analysis_history + status changes
    activity_icons = {
        "job_analysis": "analyze",
        "status_change": "status",
        "rejection_analysis": "rejection",
        "profile_upload": "upload",
    }
    recent_activity = [
        {
            "type": h.get("type", "event"),
            "text": h.get("text", ""),
            "timestamp": h.get("timestamp", ""),
        }
        for h in history[:8]
    ]

    # Group applications by status for Kanban
    by_status: dict[str, list] = {}
    for a in apps:
        s = a.get("status", "Submitted")
        by_status.setdefault(s, []).append({
            "id": a["id"],
            "company": a["company"],
            "role": a["role"],
            "match_score": a.get("skill_match_score", 0),
            "date": a.get("date_applied", "")[:10],
        })

    return {
        "total_applications": total,
        "avg_skill_match": avg_match,
        "avg_interview_probability": avg_prob,
        "interview_rate": interview_rate,
        "rejection_count": rejected,
        "top_missing_skill": top_missing_skill,
        "recent_activity": recent_activity,
        "applications_by_status": by_status,
        "skill_confidence": data["current_profile_state"].get("skill_confidence", {}),
        "has_profile": bool(data["candidate_profile"].get("skills")),
    }


# ─────────────────────────────────────────────────────────────────────────────
# GET /api/profile/state
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/profile/state")
def profile_state():
    data = load_data()
    profile = data["candidate_profile"]
    state = data["current_profile_state"]
    return {
        "skill_confidence": state.get("skill_confidence", {}),
        "last_updated": state.get("last_updated", ""),
        "has_profile": bool(profile.get("skills")),
        "profile_name": profile.get("name", ""),
        "skills_count": len(profile.get("skills", [])) + len(profile.get("tools", [])),
    }


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/agent/chat  (streaming)
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/agent/chat")
async def agent_chat(req: ChatRequest):
    data = load_data()
    profile = data["candidate_profile"]
    apps = data["applications"]
    rejections = data["rejections"]

    # Build compact context
    context_summary = {
        "name": profile.get("name", "the candidate"),
        "top_skills": (profile.get("skills", []) + profile.get("tools", []))[:10],
        "total_applications": len(apps),
        "rejections": len(rejections),
        "recent_gaps": list({g for r in rejections[:3] for g in r.get("identified_gaps", [])}),
        "current_tab": req.context.get("tab", ""),
    }
    if req.context.get("application"):
        context_summary["current_application"] = req.context["application"]

    system_prompt = f"""You are CALIBR Agent, an expert career intelligence assistant embedded in the CALIBR career platform.
You have access to the candidate's profile and history shown below. Be concise, specific, and actionable.
Maximum 3 sentences per response. Never make up job listings, companies, or skills not in the profile.

CANDIDATE CONTEXT:
{json.dumps(context_summary, indent=2)}"""

    if not groq_client:
        raise HTTPException(503, "GROQ_API_KEY is not configured. Add it to the .env file.")

    def stream_response():
        completion = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": req.message},
            ],
            temperature=0.5,
            max_tokens=300,
            stream=True,
        )
        for chunk in completion:
            delta = chunk.choices[0].delta.content or ""
            if delta:
                yield delta

    return StreamingResponse(stream_response(), media_type="text/plain")


# ─────────────────────────────────────────────────────────────────────────────
# POST /api/resume/generate
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/resume/generate")
def generate_resume_new(req: GenerateResumeRequest):
    data = load_data()
    profile = data["candidate_profile"]
    app_rec = next((a for a in data["applications"] if a["id"] == req.application_id), None)

    if not profile.get("skills"):
        raise HTTPException(400, "No candidate profile found. Upload your resume first.")
    if not app_rec:
        raise HTTPException(404, "Application not found.")

    prompt = f"""Create tailored resume content for this candidate applying to {app_rec['role']} at {app_rec['company']}.

CANDIDATE PROFILE:
{json.dumps({k: v for k, v in profile.items() if k != 'raw_resume_text'}, indent=2)}

JOB STRONG MATCH SKILLS: {json.dumps(app_rec.get('strong_skills', []))}
JOB MODERATE MATCH SKILLS: {json.dumps(app_rec.get('moderate_skills', []))}
JOB RESPONSIBILITIES: {json.dumps(app_rec.get('responsibilities', []))}

Return ONLY valid JSON:
{{
  "summary": "3 tailored sentences for this specific role and company",
  "skills_to_highlight": ["ordered list of skills by JD relevance, max 12"],
  "projects_to_include": ["2-3 most relevant project names"],
  "experience_bullets": ["3-5 achievement bullets tailored to this JD role"]
}}

Do NOT invent experience. Only use what's in the profile.
Return ONLY valid JSON. No markdown, no backticks, no explanation."""

    raw = call_groq(prompt)
    content = parse_groq_json(raw)

    if "error" in content:
        raise HTTPException(500, f"AI generation failed: {content.get('raw', '')[:200]}")

    # Build PDF with ReportLab
    name = profile.get("name") or "Candidate"
    pdf_filename = f"resume_{app_rec['id'][:8]}.pdf"
    pdf_path = os.path.join("resumes", pdf_filename)

    doc = SimpleDocTemplate(pdf_path, pagesize=letter, rightMargin=60, leftMargin=60, topMargin=60, bottomMargin=40)
    styles = getSampleStyleSheet()

    name_style = ParagraphStyle("Name", parent=styles["Heading1"], fontSize=22, spaceAfter=4, textColor=colors.HexColor("#0A0A0A"), fontName="Helvetica-Bold")
    contact_style = ParagraphStyle("Contact", parent=styles["Normal"], fontSize=10, textColor=colors.HexColor("#555"), spaceAfter=12)
    section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=12, spaceBefore=14, spaceAfter=4, textColor=colors.HexColor("#1A1A2E"), fontName="Helvetica-Bold")
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10.5, leading=15, spaceAfter=8, textColor=colors.HexColor("#333"))
    bullet_style = ParagraphStyle("Bullet", parent=styles["Normal"], fontSize=10.5, leading=15, leftIndent=14, spaceAfter=5, textColor=colors.HexColor("#333"))

    flowables = []
    flowables.append(Paragraph(f"<b>{name}</b>", name_style))
    email = f"{name.lower().replace(' ', '.')}@email.com"
    flowables.append(Paragraph(f"{email} | linkedin.com/in/{name.lower().replace(' ', '')}", contact_style))
    flowables.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#00E5A0"), spaceAfter=12))

    flowables.append(Paragraph("<b>PROFESSIONAL SUMMARY</b>", section_style))
    flowables.append(Paragraph(content.get("summary", ""), body_style))

    flowables.append(Paragraph("<b>CORE SKILLS</b>", section_style))
    skills_text = " • ".join(content.get("skills_to_highlight", profile.get("skills", [])))
    flowables.append(Paragraph(skills_text, body_style))

    flowables.append(Paragraph("<b>PROFESSIONAL EXPERIENCE</b>", section_style))
    for bullet in content.get("experience_bullets", []):
        flowables.append(Paragraph(f"• {bullet}", bullet_style))

    flowables.append(Paragraph("<b>PROJECTS</b>", section_style))
    for proj in content.get("projects_to_include", profile.get("projects", [])[:2]):
        flowables.append(Paragraph(f"• {proj}", bullet_style))

    flowables.append(Paragraph("<b>EDUCATION</b>", section_style))
    flowables.append(Paragraph(profile.get("education", ""), body_style))

    doc.build(flowables)

    # Log activity
    data["analysis_history"].insert(0, {
        "type": "resume_generated",
        "text": f"Resume generated for {app_rec['role']} at {app_rec['company']}",
        "timestamp": now_iso(),
        "application_id": req.application_id,
    })
    save_data(data)

    return {
        "status": "success",
        "download_url": f"http://localhost:8000/resumes/{pdf_filename}",
        "preview": {
            "summary": content.get("summary", ""),
            "highlighted_skills": content.get("skills_to_highlight", [])[:6],
            "selected_projects": content.get("projects_to_include", []),
        },
    }



# ─────────────────────────────────────────────────────────────────────────────
# INTERVIEW SIMULATOR ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/api/interview/start")
def interview_start(req: InterviewStartRequest):
    data = load_data()
    profile = data["candidate_profile"]
    apps = data["applications"]

    if not profile.get("skills"):
        raise HTTPException(400, "No candidate profile. Upload your resume first.")

    app_rec = next((a for a in apps if a["id"] == req.application_id), None)
    if not app_rec:
        raise HTTPException(404, "Application not found.")

    company = app_rec["company"]
    role = app_rec["role"]
    jd_summary = app_rec.get("jd_text", "")[:1500]
    profile_summary = {
        "name": profile.get("name", "Candidate"),
        "skills": (profile.get("skills", []) + profile.get("tools", []))[:12],
        "experience_years": profile.get("experience_years", 0),
        "domains": profile.get("domains", []),
    }

    prompt = f"""You are a senior interviewer at {company} hiring for {role}.
Candidate profile: {json.dumps(profile_summary)}
Job description: {jd_summary}
Interview type: {req.interview_type}

Generate 5 interview questions.
Mix difficulty: 2 easy, 2 medium, 1 hard.
Make questions SPECIFIC to this JD and company. Not generic.

Return ONLY valid JSON:
{{
  "company": "{company}",
  "role": "{role}",
  "interview_type": "{req.interview_type}",
  "questions": [
    {{
      "id": 1,
      "question": "question text",
      "difficulty": "easy",
      "category": "category name",
      "ideal_answer_hints": ["hint 1", "hint 2", "hint 3"]
    }}
  ]
}}

Return ONLY valid JSON. No markdown, no backticks, no explanation."""

    raw = call_groq(prompt, temperature=0.5)
    result = parse_groq_json(raw)

    if "error" in result:
        raise HTTPException(500, f"AI failed to generate questions: {result.get('raw', '')[:200]}")

    session_id = str(uuid.uuid4())
    session = {
        "session_id": session_id,
        "application_id": req.application_id,
        "company": company,
        "role": role,
        "interview_type": req.interview_type,
        "questions": result.get("questions", []),
        "evaluations": {},
        "status": "active",
        "started_at": now_iso(),
        "completed_at": None,
        "final_report": None,
    }

    if "interview_sessions" not in data:
        data["interview_sessions"] = []
    data["interview_sessions"].insert(0, session)

    data["analysis_history"].insert(0, {
        "type": "interview_started",
        "text": f"Interview session started — {company} {role} ({req.interview_type})",
        "timestamp": now_iso(),
        "application_id": req.application_id,
    })
    save_data(data)

    # Strip ideal_answer_hints before sending to frontend
    questions_stripped = []
    for q in session["questions"]:
        q_copy = dict(q)
        q_copy.pop("ideal_answer_hints", None)
        questions_stripped.append(q_copy)

    return {
        "session_id": session_id,
        "company": company,
        "role": role,
        "interview_type": req.interview_type,
        "questions": questions_stripped,
    }


@app.post("/api/interview/evaluate")
def interview_evaluate(req: InterviewEvaluateRequest):
    data = load_data()
    sessions = data.get("interview_sessions", [])
    session = next((s for s in sessions if s["session_id"] == req.session_id), None)
    if not session:
        raise HTTPException(404, "Session not found.")

    questions = session.get("questions", [])
    q = next((x for x in questions if x["id"] == req.question_id), None)
    if not q:
        raise HTTPException(404, "Question not found.")

    hints = q.get("ideal_answer_hints", [])

    prompt = f"""You are evaluating a candidate's interview answer.
Question: {q['question']}
Ideal answer should cover: {json.dumps(hints)}
Candidate's answer: {req.answer}

Be honest and tough. This helps the candidate improve.
Do not be vague. Reference their actual answer.

Return ONLY valid JSON:
{{
  "score": 7,
  "verdict": "Good",
  "what_was_good": "one specific sentence about what worked",
  "what_was_missing": "one specific sentence about what was missing",
  "ideal_answer_summary": "two sentences about what a great answer looks like",
  "follow_up_question": "one natural follow-up question the interviewer would ask"
}}

verdict must be one of: "Strong", "Good", "Needs Work", "Weak"
Return ONLY valid JSON. No markdown, no backticks, no explanation."""

    raw = call_groq(prompt, temperature=0.3)
    evaluation = parse_groq_json(raw)

    if "error" in evaluation:
        raise HTTPException(500, f"AI evaluation failed: {evaluation.get('raw', '')[:200]}")

    evaluation["question_id"] = req.question_id
    evaluation["answer"] = req.answer
    evaluation["evaluated_at"] = now_iso()

    if "evaluations" not in session:
        session["evaluations"] = {}
    session["evaluations"][str(req.question_id)] = evaluation
    save_data(data)

    return evaluation


@app.post("/api/interview/complete")
def interview_complete(req: InterviewCompleteRequest):
    data = load_data()
    sessions = data.get("interview_sessions", [])
    session = next((s for s in sessions if s["session_id"] == req.session_id), None)
    if not session:
        raise HTTPException(404, "Session not found.")

    questions = session.get("questions", [])
    evaluations = session.get("evaluations", {})

    qa_pairs = []
    for q in questions:
        qid = str(q["id"])
        ev = evaluations.get(qid, {})
        qa_pairs.append({
            "question": q["question"],
            "category": q.get("category", ""),
            "difficulty": q.get("difficulty", "medium"),
            "answer": ev.get("answer", "(not answered)"),
            "score": ev.get("score", 0),
            "verdict": ev.get("verdict", "Weak"),
        })

    prompt = f"""Review this complete mock interview.
Company: {session['company']}
Role: {session['role']}
Interview type: {session['interview_type']}

Questions and evaluations:
{json.dumps(qa_pairs, indent=2)}

Return ONLY valid JSON:
{{
  "overall_score": 72,
  "performance_grade": "Good",
  "strongest_area": "specific area name",
  "weakest_area": "specific area name",
  "top_3_improvements": ["specific actionable item 1", "specific actionable item 2", "specific actionable item 3"],
  "interview_readiness": 68,
  "summary": "Three honest sentences about this candidate's performance."
}}

performance_grade must be one of: "Excellent", "Good", "Average", "Needs Work"
Return ONLY valid JSON. No markdown, no backticks, no explanation."""

    raw = call_groq(prompt, temperature=0.3)
    report = parse_groq_json(raw)

    if "error" in report:
        raise HTTPException(500, f"AI report generation failed: {report.get('raw', '')[:200]}")

    report["completed_at"] = now_iso()
    session["final_report"] = report
    session["status"] = "completed"
    session["completed_at"] = now_iso()

    # Update skill_confidence based on performance
    overall_score = report.get("overall_score", 50)
    skill_conf = data["current_profile_state"].get("skill_confidence", {})
    interview_type = session.get("interview_type", "")
    skill_map = {
        "technical": ["System Design", "Python", "SQL", "Data Structures", "Algorithms"],
        "behavioral": ["Stakeholder Management", "Agile", "Leadership"],
        "product": ["Product Management", "User Research", "A/B Testing", "Roadmapping"],
        "hr": ["Communication", "Agile"],
    }
    relevant_skills = skill_map.get(interview_type, [])
    delta = 5 if overall_score >= 70 else (-5 if overall_score < 50 else 0)
    for skill in relevant_skills:
        nm = normalize_skill(skill)
        if nm in skill_conf:
            skill_conf[nm] = max(10, min(100, skill_conf[nm] + delta))
    data["current_profile_state"]["skill_confidence"] = skill_conf
    data["current_profile_state"]["last_updated"] = now_iso()

    data["analysis_history"].insert(0, {
        "type": "interview_completed",
        "text": f"Interview completed — {session['company']} {session['role']} | Score: {overall_score}/100",
        "timestamp": now_iso(),
        "application_id": session.get("application_id", ""),
    })
    save_data(data)

    return report


@app.get("/api/interview/history")
def interview_history():
    data = load_data()
    sessions = data.get("interview_sessions", [])
    summaries = []
    for s in sessions:
        report = s.get("final_report") or {}
        summaries.append({
            "session_id": s["session_id"],
            "application_id": s.get("application_id", ""),
            "company": s["company"],
            "role": s["role"],
            "interview_type": s["interview_type"],
            "status": s.get("status", "active"),
            "overall_score": report.get("overall_score"),
            "performance_grade": report.get("performance_grade"),
            "questions_answered": len(s.get("evaluations", {})),
            "total_questions": len(s.get("questions", [])),
            "started_at": s.get("started_at", ""),
            "completed_at": s.get("completed_at"),
        })
    return {"sessions": summaries}


@app.get("/api/interview/session/{session_id}")
def interview_session_detail(session_id: str):
    data = load_data()
    sessions = data.get("interview_sessions", [])
    session = next((s for s in sessions if s["session_id"] == session_id), None)
    if not session:
        raise HTTPException(404, "Session not found.")
    return session


# ─────────────────────────────────────────────────────────────────────────────
# DEMO MODE ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

DEMO_DATA = {
    "candidate_profile": {
        "name": "Arjun Mehta",
        "raw_resume_text": "B.Tech Computer Science graduate with experience in Product Management, SQL, Python, and user research. Built multiple consumer and B2B SaaS products.",
        "skills": [
            "Product Management", "SQL", "Python", "User Research",
            "A/B Testing", "Figma", "JIRA", "Data Analysis",
            "Agile", "Roadmapping", "Stakeholder Management"
        ],
        "tools": ["Mixpanel", "Amplitude", "Notion", "Slack", "Excel"],
        "projects": [
            "EdTech LMS Platform — led 0-to-1 product launch with 10K MAUs",
            "B2B SaaS Analytics Dashboard — shipped 3 major feature cycles",
            "Consumer App A/B Testing Framework — improved conversion by 18%"
        ],
        "experience_years": 1,
        "domains": ["B2B SaaS", "EdTech", "Consumer Apps"],
        "education": "B.Tech Computer Science, 2024",
    },
    "current_profile_state": {
        "skill_confidence": {
            "Product Management": 78,
            "SQL": 65,
            "Python": 58,
            "User Research": 82,
            "A/B Testing": 70,
            "Figma": 75,
            "JIRA": 80,
            "Data Analysis": 62,
            "Agile": 85,
            "System Design": 42,
            "Stakeholder Management": 71,
            "Mixpanel": 68,
            "Amplitude": 64,
            "Roadmapping": 74,
        },
        "last_updated": "",
    },
    "applications": [
        {
            "id": "demo-app-001",
            "company": "Google",
            "role": "APM Program",
            "jd_text": "Associate Product Manager at Google. Drive product strategy, work with engineers, define roadmap, conduct user research.",
            "status": "Interview",
            "skill_match_score": 81,
            "interview_probability": 78,
            "strong_skills": ["Product Management", "User Research", "Agile", "Data Analysis"],
            "moderate_skills": ["SQL", "Python", "Roadmapping"],
            "missing_skills": ["System Design", "Machine Learning Basics"],
            "required_skills": ["Product Management", "Data Analysis", "SQL", "System Design"],
            "preferred_skills": ["Python", "Machine Learning Basics"],
            "responsibilities": [
                "Define product vision and roadmap",
                "Work closely with engineering and design teams",
                "Conduct user research and synthesize insights",
                "Drive OKR definition and tracking",
                "Launch features and measure impact"
            ],
            "experience_level": "0-2 years",
            "date_applied": "2024-02-10T06:30:00+00:00",
            "notes": "Cleared resume round. Interview scheduled for next week.",
        },
        {
            "id": "demo-app-002",
            "company": "Flipkart",
            "role": "Product Manager",
            "jd_text": "Product Manager for Flipkart's seller platform. Own the end-to-end seller experience, drive growth metrics.",
            "status": "Submitted",
            "skill_match_score": 74,
            "interview_probability": 62,
            "strong_skills": ["Product Management", "JIRA", "Stakeholder Management"],
            "moderate_skills": ["A/B Testing", "Data Analysis"],
            "missing_skills": ["E-commerce Domain", "Supply Chain"],
            "required_skills": ["Product Management", "E-commerce Domain", "Data Analysis", "JIRA"],
            "preferred_skills": ["Supply Chain", "SQL"],
            "responsibilities": [
                "Own seller acquisition and retention product",
                "Collaborate with business and tech teams",
                "Build roadmap for seller tools"
            ],
            "experience_level": "1-3 years",
            "date_applied": "2024-02-08T09:00:00+00:00",
            "notes": "",
        },
        {
            "id": "demo-app-003",
            "company": "Razorpay",
            "role": "Associate PM",
            "jd_text": "Associate PM for payments infrastructure. Deep understanding of payment systems, APIs, and fintech products required.",
            "status": "Rejected",
            "skill_match_score": 67,
            "interview_probability": 45,
            "strong_skills": ["Product Management", "Agile"],
            "moderate_skills": ["User Research", "SQL"],
            "missing_skills": ["System Design", "Payments Domain", "API Design"],
            "required_skills": ["Product Management", "System Design", "Payments Domain"],
            "preferred_skills": ["Python", "API Design"],
            "responsibilities": [
                "Own payment gateway features",
                "Work with platform engineering",
                "Define API contracts for merchant integrations"
            ],
            "experience_level": "0-2 years",
            "date_applied": "2024-01-20T07:00:00+00:00",
            "notes": "Rejected after technical round. Weak on system design.",
        },
        {
            "id": "demo-app-004",
            "company": "Swiggy",
            "role": "PM Intern",
            "jd_text": "PM Intern for Swiggy's growth team. Help define experiments, analyze data, and work with cross-functional teams.",
            "status": "Offer",
            "skill_match_score": 88,
            "interview_probability": 91,
            "strong_skills": ["Product Management", "A/B Testing", "Data Analysis", "User Research", "Agile"],
            "moderate_skills": ["SQL", "Figma"],
            "missing_skills": [],
            "required_skills": ["Product Management", "A/B Testing", "Data Analysis"],
            "preferred_skills": ["SQL", "Figma", "Mixpanel"],
            "responsibilities": [
                "Design and run product experiments",
                "Analyze user behavior data",
                "Write PRDs for growth features"
            ],
            "experience_level": "0-1 year",
            "date_applied": "2024-01-15T08:00:00+00:00",
            "notes": "Offer received! ₹50K/month internship. Deciding.",
        },
        {
            "id": "demo-app-005",
            "company": "Meesho",
            "role": "Product Analyst",
            "jd_text": "Product Analyst to support PM team with data analysis, dashboard creation, and funnel optimization.",
            "status": "In Review",
            "skill_match_score": 72,
            "interview_probability": 66,
            "strong_skills": ["Data Analysis", "SQL", "Mixpanel", "Amplitude"],
            "moderate_skills": ["Python", "A/B Testing"],
            "missing_skills": ["dbt", "Looker"],
            "required_skills": ["SQL", "Data Analysis", "Python", "Mixpanel"],
            "preferred_skills": ["dbt", "Looker", "Tableau"],
            "responsibilities": [
                "Build and maintain product dashboards",
                "Analyze funnel conversion and drop-offs",
                "Partner with PMs on experiment design"
            ],
            "experience_level": "0-2 years",
            "date_applied": "2024-02-05T11:00:00+00:00",
            "notes": "",
        },
        {
            "id": "demo-app-006",
            "company": "CRED",
            "role": "PM Fresher",
            "jd_text": "PM Fresher for CRED's fintech products. Work on credit card management, rewards, and financial wellness features.",
            "status": "Interview",
            "skill_match_score": 79,
            "interview_probability": 73,
            "strong_skills": ["Product Management", "User Research", "Figma", "JIRA"],
            "moderate_skills": ["Data Analysis", "Stakeholder Management"],
            "missing_skills": ["Fintech Domain", "System Design"],
            "required_skills": ["Product Management", "User Research", "Fintech Domain"],
            "preferred_skills": ["Figma", "System Design"],
            "responsibilities": [
                "Own credit card management features",
                "Conduct user interviews",
                "Define metrics and OKRs"
            ],
            "experience_level": "0-1 year",
            "date_applied": "2024-02-12T10:00:00+00:00",
            "notes": "First round cleared. Case study round next.",
        },
    ],
    "rejections": [
        {
            "id": "demo-rej-001",
            "application_id": "demo-app-003",
            "company": "Razorpay",
            "role": "Associate PM",
            "user_notes": "Interviewer said my system design was weak. Could not answer the payments infrastructure question. They asked me to design a payment retry system and I couldn't structure the components properly.",
            "identified_gaps": ["System Design", "Payments Domain", "API Architecture"],
            "skill_confidence_impact": {"System Design": -18, "Python": -8},
            "learning_suggestions": [
                {"skill": "System Design", "resource_type": "course", "hours": 20},
                {"skill": "Payments Domain", "resource_type": "blog", "hours": 5},
                {"skill": "API Architecture", "resource_type": "project", "hours": 10},
            ],
            "summary": "Rejected due to weak system design fundamentals and lack of payments domain knowledge — needs to study distributed systems and fintech architectures.",
            "analyzed_at": "2024-01-25T12:00:00+00:00",
        },
        {
            "id": "demo-rej-002",
            "application_id": "demo-app-002",
            "company": "InMobi",
            "role": "Associate PM",
            "user_notes": "Didn't do well in the metrics design round. They asked me to define success metrics for a new feature and I gave vague answers without thinking about north star metrics vs guardrail metrics.",
            "identified_gaps": ["Metrics Framework", "Data Analysis", "Analytical Thinking"],
            "skill_confidence_impact": {"Data Analysis": -12, "SQL": -6},
            "learning_suggestions": [
                {"skill": "Metrics Framework", "resource_type": "course", "hours": 8},
                {"skill": "Data Analysis", "resource_type": "project", "hours": 15},
            ],
            "summary": "Rejected due to weak metrics thinking — struggled to define north star vs guardrail metrics and could not think analytically about product success measurement.",
            "analyzed_at": "2024-01-18T14:00:00+00:00",
        },
    ],
    "analysis_history": [
        {"type": "interview_completed", "text": "Interview completed — Google APM Program | Score: 72/100", "timestamp": "2024-02-15T09:00:00+00:00", "application_id": "demo-app-001"},
        {"type": "status_change", "text": "Swiggy moved from Interview → Offer", "timestamp": "2024-02-14T11:00:00+00:00", "application_id": "demo-app-004"},
        {"type": "rejection_analysis", "text": "Rejection from Razorpay analyzed — 3 gaps found", "timestamp": "2024-01-25T12:00:00+00:00", "application_id": "demo-app-003"},
        {"type": "job_analysis", "text": "Analyzed PM Fresher at CRED", "timestamp": "2024-02-12T10:00:00+00:00", "application_id": "demo-app-006"},
        {"type": "job_analysis", "text": "Analyzed APM Program at Google", "timestamp": "2024-02-10T06:30:00+00:00", "application_id": "demo-app-001"},
        {"type": "profile_upload", "text": "Resume uploaded — 11 skills detected", "timestamp": "2024-01-10T08:00:00+00:00", "application_id": ""},
    ],
    "interview_sessions": [
        {
            "session_id": "demo-session-001",
            "application_id": "demo-app-001",
            "company": "Google",
            "role": "APM Program",
            "interview_type": "technical",
            "questions": [
                {"id": 1, "question": "How would you design the backend architecture for a real-time collaborative document editor like Google Docs?", "difficulty": "hard", "category": "System Design", "ideal_answer_hints": ["Operational transforms or CRDTs", "WebSocket connections", "Conflict resolution"]},
                {"id": 2, "question": "Walk me through how you would define success metrics for Google Maps' ETA prediction feature.", "difficulty": "medium", "category": "Product Metrics"},
                {"id": 3, "question": "What is the difference between a north star metric and a guardrail metric? Give an example for a search product.", "difficulty": "easy", "category": "Metrics"},
                {"id": 4, "question": "A competitor launches a feature very similar to one you shipped last month. How do you respond as a PM?", "difficulty": "medium", "category": "Product Strategy"},
                {"id": 5, "question": "Explain the CAP theorem and when you would choose consistency over availability in a product context.", "difficulty": "easy", "category": "System Design Basics"},
            ],
            "evaluations": {
                "1": {"score": 5, "verdict": "Needs Work", "what_was_good": "Mentioned WebSockets and the need for conflict resolution which shows awareness of the problem space.", "what_was_missing": "Did not mention CRDTs or Operational Transforms — the core algorithm behind collaborative editing.", "ideal_answer_summary": "A strong answer would cover CRDTs or OT for conflict-free merging, WebSocket connections per user, and a server-side history log.", "follow_up_question": "How does Google Docs handle two users editing the same sentence at the exact same millisecond?", "question_id": 1, "answer": "I would use WebSockets for real-time updates and have a server that manages the document state. When two users edit, the server would pick one edit and broadcast it.", "evaluated_at": "2024-02-15T09:05:00+00:00"},
                "2": {"score": 8, "verdict": "Strong", "what_was_good": "Correctly identified accuracy rate and user trust as the north star, with latency as guardrail — very product-thinking approach.", "what_was_missing": "Could have mentioned edge cases like traffic incident detection lag affecting ETA accuracy.", "ideal_answer_summary": "A great answer defines ETA accuracy (actual vs predicted) as north star, user re-routing rate as health metric, and adds coverage metrics for underserved regions.", "follow_up_question": "How would you measure 'user trust' in the ETA — what proxy metric would you use?", "question_id": 2, "answer": "I'd track ETA accuracy as the north star — comparing predicted vs actual arrival time. Guardrail metrics would be app load time and battery usage. I'd also track if users are rerouting often as a sign of distrust.", "evaluated_at": "2024-02-15T09:10:00+00:00"},
                "3": {"score": 9, "verdict": "Strong", "what_was_good": "Clean, crisp definition with a well-chosen search example — north star as click-through rate, guardrail as query latency.", "what_was_missing": "Could mention that guardrail metrics have hard thresholds, not just monitoring levels.", "ideal_answer_summary": "North star = primary value metric (e.g., search result CTR). Guardrail = metrics that should never degrade (e.g., page load < 200ms). Both serve different decision-making purposes.", "follow_up_question": "What happens when your north star metric improves but a guardrail metric degrades — do you ship the feature?", "question_id": 3, "answer": "North star metric is the primary measure of product value — for search it'd be click-through rate or search success rate. Guardrail metrics are ones you can't let degrade — like query latency under 200ms. You optimize for north star but guardrails have hard stops.", "evaluated_at": "2024-02-15T09:15:00+00:00"},
                "4": {"score": 7, "verdict": "Good", "what_was_good": "Good instinct to analyze the competitor's differentiation and avoid panic-shipping a copycat response.", "what_was_missing": "Didn't address how to use this as intelligence for roadmap prioritization or customer retention plays.", "ideal_answer_summary": "Analyze differentiation gaps, talk to churning users, accelerate next-gen roadmap rather than playing catchup, and use PR/marketing to reinforce your product's unique value.", "follow_up_question": "If 15% of your power users start trialing the competitor's feature, what data would you pull first?", "question_id": 4, "answer": "First I wouldn't panic and ship a clone. I'd analyze what exactly they shipped — is it identical or a different angle? Then I'd talk to customers who are evaluating the switch. We'd decide if we need to counter with a differentiated version or focus on what they don't have.", "evaluated_at": "2024-02-15T09:20:00+00:00"},
                "5": {"score": 6, "verdict": "Good", "what_was_good": "Got the core tradeoff right — consistency for financial products, availability for social feeds.", "what_was_missing": "Didn't mention partition tolerance as the third leg of CAP or how modern systems use eventual consistency as a middle ground.", "ideal_answer_summary": "CAP theorem: a distributed system can only guarantee 2 of Consistency, Availability, Partition Tolerance. Choose consistency for banking/payments; availability for social media — with eventual consistency as a production-realistic middle ground.", "follow_up_question": "How does a product like UPI handle partition events — which does it prioritize?", "question_id": 5, "answer": "CAP theorem says distributed systems can only guarantee 2 of 3: consistency, availability, partition tolerance. For a payments product you'd prioritize consistency — you'd rather show an error than show wrong balance. For a social feed, availability is fine — seeing stale posts is okay.", "evaluated_at": "2024-02-15T09:25:00+00:00"},
            },
            "status": "completed",
            "started_at": "2024-02-15T09:00:00+00:00",
            "completed_at": "2024-02-15T09:30:00+00:00",
            "final_report": {
                "overall_score": 72,
                "performance_grade": "Good",
                "strongest_area": "Product Metrics & Strategy",
                "weakest_area": "System Design",
                "top_3_improvements": [
                    "Study CRDTs and Operational Transforms — these are foundational for distributed systems questions at FAANG-level interviews.",
                    "Practice CAP theorem application with real fintech/infra examples — go beyond the definition to the tradeoffs.",
                    "For every system design answer, use the framework: Requirements → High-Level Design → Deep Dive → Tradeoffs."
                ],
                "interview_readiness": 68,
                "summary": "Arjun demonstrates strong product thinking in metrics and strategy questions but struggles with the technical depth expected at Google APM level. System design is the clear weak point — answers show awareness but lack the architectural precision needed. Focusing on distributed systems fundamentals for 3-4 weeks could push him to interview-ready.",
                "completed_at": "2024-02-15T09:30:00+00:00",
            },
        }
    ],
}


@app.post("/api/demo/seed")
def demo_seed():
    demo = json.loads(json.dumps(DEMO_DATA))
    # Set timestamps to recent dates
    now = now_iso()
    demo["current_profile_state"]["last_updated"] = now
    save_data(demo)
    return {"success": True, "message": "Demo data loaded with Arjun Mehta's profile."}


@app.post("/api/demo/reset")
def demo_reset():
    save_data(json.loads(json.dumps(EMPTY_SCHEMA)))
    return {"success": True, "message": "App reset to empty state."}


# ─────────────────────────────────────────────────────────────────────────────
# LEGACY ENDPOINTS (kept for backward compat with old frontend calls)
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/analyze-profile")
async def legacy_analyze_profile(file: UploadFile = File(...)):
    """Legacy endpoint — delegates to new /api/profile/upload"""
    return await upload_profile(file)


@app.post("/analyze-jd")
async def legacy_analyze_jd(req: LegacyJDRequest):
    """Legacy endpoint — delegates to new /api/analyze/job"""
    new_req = AnalyzeJobRequest(jd_text=req.job_description)
    result = await analyze_job(new_req)
    return result


@app.post("/analyze-rejection")
def legacy_analyze_rejection(req: LegacyRejectionRequest):
    """Legacy endpoint — delegates to new /api/rejections/analyze"""
    # Find app by position or create temp
    data = load_data()
    apps = data["applications"]
    app_rec = apps[req.application_id - 1] if 0 < req.application_id <= len(apps) else None
    app_id = app_rec["id"] if app_rec else str(uuid.uuid4())
    new_req = AnalyzeRejectionRequest(application_id=app_id, user_notes=req.rejection_notes)
    return analyze_rejection(new_req)


@app.post("/global-analysis")
def legacy_global_analysis():
    return career_analysis()


@app.post("/predict-job-fit")
def legacy_predict_fit(req: LegacyPredictRequest):
    """Legacy — keep for old frontend using the old ApplyTab flow"""
    skill_match = req.skill_match_score
    experience_score = 0.7
    final = int(min(100, max(0, skill_match * 0.6 + experience_score * 25 + 10)))
    return {
        "interview_probability": final,
        "positive_factors": [f"Skill match of {skill_match}% is strong."],
        "negative_factors": [],
    }


@app.post("/generate-resume")
def legacy_generate_resume(req: LegacyGenerateResumeRequest):
    """Legacy — generate without application_id"""
    data = load_data()
    apps = data["applications"]
    # Use the most recent application if available
    if apps:
        app_id = apps[0]["id"]
        new_req = GenerateResumeRequest(application_id=app_id)
        return generate_resume_new(new_req)
    # Fallback — create a minimal app record
    app_id = str(uuid.uuid4())
    data["applications"].insert(0, {
        "id": app_id,
        "company": req.company,
        "role": req.job_role,
        "jd_text": "",
        "status": "Submitted",
        "skill_match_score": req.skill_match,
        "interview_probability": 0,
        "strong_skills": [],
        "moderate_skills": [],
        "missing_skills": [],
        "required_skills": [],
        "preferred_skills": [],
        "responsibilities": [],
        "experience_level": "",
        "date_applied": now_iso(),
        "notes": "",
    })
    save_data(data)
    new_req = GenerateResumeRequest(application_id=app_id)
    return generate_resume_new(new_req)


# ─────────────────────────────────────────────────────────────────────────────
# KB endpoints (kept)
# ─────────────────────────────────────────────────────────────────────────────
try:
    from knowledge_base_loader import kb

    @app.get("/kb-status")
    def kb_status():
        return kb.get_status()

    @app.post("/kb-reload")
    def kb_reload():
        kb.reload()
        return {"message": "Knowledge Base reloaded", "status": kb.get_status()}

    @app.post("/kb-open")
    def kb_open():
        import subprocess, sys
        kb_path = os.path.abspath("knowledge_base")
        try:
            if sys.platform == "win32":
                os.startfile(kb_path)
            elif sys.platform == "darwin":
                subprocess.Popen(["open", kb_path])
            else:
                subprocess.Popen(["xdg-open", kb_path])
            return {"message": "Folder opened"}
        except Exception as e:
            return {"error": str(e)}

except ImportError:
    logger.warning("knowledge_base_loader not found — KB endpoints disabled")


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
