# CALIBR — Product Case Study
### Agentic Career Intelligence Platform
*Built by [Your Name] | March 2026*
*Live: https://careercopilot-web.vercel.app*
*GitHub: https://github.com/[username]/calibr-app*

---

## 1. The Problem

**Who is the user?**
Final-year students and fresh graduates applying for jobs for the first time. Applying blindly to 50+ companies with the same resume, getting rejected, not knowing why, and repeating the same mistakes.

**What is broken today?**
- Resume builders generate static documents with no feedback loop
- Job trackers are passive — they record what happened, not why
- No tool connects rejection feedback back to skill improvement
- Candidates have no visibility into their own skill gaps over time

**The insight that drove CALIBR:**
Every rejection contains signal. Most candidates ignore it.
What if a tool extracted that signal and used it to continuously improve your career strategy?

---

## 2. The Solution

CALIBR is an agentic AI system that:
- Analyzes your resume against any job description
- Predicts interview probability with reasoning
- Tracks all your applications in one place
- Learns from every rejection to update your skill profile
- Evolves your career strategy over time

**One-line pitch:**
> "CALIBR doesn't just help you apply — it learns from your rejections and evolves your career strategy."

---

## 3. Product Decisions (The PM Thinking)

### Decision 1: Why a "living profile" instead of a static resume?
Static resumes don't capture what you've learned or where you've struggled. A living profile that updates confidence scores based on rejection feedback gives the user an honest real-time view of their actual career readiness — not just what they wrote on their resume 6 months ago.

### Decision 2: Why skill confidence scores (not just skill presence)?
"Has Python" is binary and useless. "Python confidence: 58% (dropped 12% after 2 rejections that cited weak scripting)" is actionable. The confidence model forces the product to be honest with the user even when they don't want to hear it.

### Decision 3: Why rejection intelligence as the core USP?
Every other career tool focuses on the apply phase. Zero tools focus on the learn-from-failure phase. That gap is where CALIBR lives. Rejections are the richest source of career signal — they just need to be processed.

### Decision 4: Why not persist to a database?
For a solo-built v1, local JSON storage reduces complexity and deployment cost to zero while validating the core loop. The schema is database-ready — migrating to PostgreSQL is a 1-day task once user growth justifies it.

---

## 4. Features Built

| Feature | What it does | PM Value |
|---------|-------------|----------|
| Resume Analyzer | Extracts skills, tools, projects via AI | Eliminates manual input friction |
| JD Analyzer | Maps JD requirements to candidate profile | Gives instant fit signal |
| Skill Match Engine | Semantic similarity scoring (0-100%) | Honest, not just keyword match |
| Living Profile | Skill confidence auto-updates from rejections | Core USP — learns over time |
| Application Pipeline | 5-stage Kanban with drag-and-drop | Single source of truth |
| Rejection Intelligence | Extracts gaps from rejection notes | Turns failure into strategy |
| Career Intelligence | Aggregates patterns across all rejections | Macro career view |
| Interview Simulator | AI mock interview with scoring | Closes the preparation gap |
| Resume Generator | JD-tailored PDF with ReportLab | Saves 2hr per application |
| CALIBR Agent | Context-aware AI copilot | Always-on career advisor |

---

## 5. Technical Architecture

```
Frontend:  React + TypeScript + Vite + Tailwind CSS
Backend:   FastAPI (Python)
AI:        Groq API (LLaMA 3.3 70B) — chosen for speed + free tier
Storage:   Local JSON (schema-ready for PostgreSQL migration)
PDF:       ReportLab
Deployment: Vercel (frontend) + Render (backend)
```

**Anti-hallucination measures:**
- Closed vocabulary skill list (skills.md knowledge base)
- Skill normalization layer ("ML" → "Machine Learning")
- Unknown skills marked and excluded from calculations
- All AI prompts end with "Return ONLY valid JSON"

---

## 6. Metrics I Would Track (If This Were Live)

**Acquisition:**
- Weekly active users
- Resume uploads per week

**Engagement:**
- Applications tracked per user
- Rejections analyzed per user *(key: are they using the USP?)*
- Return rate after first rejection logged

**Outcome (the real north star):**
- Self-reported interview rate improvement
- "Skill match score when getting interviews" vs "Skill match score when getting rejected" — validates that the engine actually predicts outcomes

**Health:**
- AI response accuracy (user corrections)
- PDF generation success rate

---

## 7. What I Would Build Next (Roadmap)

### V1.1 — Social proof layer
Anonymized benchmarking: *"Your SQL confidence is 65%. Candidates who got hired at Razorpay had avg 78%."* Data from opt-in users makes the recommendations dramatically more credible.

### V1.2 — Company intelligence
Scrape public interview experiences (Glassdoor, LeetCode discuss) to tell users what skills a specific company actually tests — not just what the JD says.

### V1.3 — Peer cohort
Group users applying to the same company/role. Share (anonymized) rejection patterns so everyone learns from the cohort's collective failures.

### V2.0 — Recruiter-side product
Flip the model: let companies post JDs and see a ranked list of candidates whose living profiles match — with confidence scores, not just keyword counts.

---

## 8. What I Learned Building This

**On product:**
- The hardest PM decision was choosing what NOT to build. Early versions had 12 features. The living profile + rejection intelligence needed to be the clear core. Everything else supports those two ideas or gets cut.
- Empty states are a product decision, not a UI detail. Every empty screen is a chance to onboard or a chance to confuse. I wrote copy for every empty state before writing a single line of code for that screen.

**On AI product development:**
- Prompt engineering IS product design. The quality of your AI feature is determined by how well you specify what you want — exactly like a PRD.
- Hallucination is a product problem, not a model problem. The solution is constraints: closed vocabulary, structured output, validation layers. You design around it.

**On being a fresher building this:**
- I am the exact user. Every design decision came from my own frustration with the job search process. That is an unfair advantage that no senior PM has.

---
*Case study last updated: March 2026*
*Questions? [your email]*
