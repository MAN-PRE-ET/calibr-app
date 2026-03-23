# LinkedIn Post Assets — CALIBR Launch

---

## POST 1 — The Launch Post *(use this first)*

I got tired of applying to jobs and not knowing why I was getting rejected.

So I built something.

CALIBR is an AI career intelligence system that:
→ Analyzes your resume against any job description
→ Scores your skill match (not just keyword matching — semantic similarity)
→ Learns from every rejection to update your skill profile
→ Predicts your interview probability with actual reasoning
→ Runs AI mock interviews and scores your answers

The feature I'm most proud of: **Rejection Intelligence.**

Every time you log a rejection with notes, CALIBR extracts the skill gaps, reduces your confidence scores for those skills, and builds a personalized learning roadmap.

It literally learns from your failures.

Built with: React + FastAPI + Groq (LLaMA 3.3 70B) + Python

🔗 Live demo: https://careercopilot-web.vercel.app?demo=true
📂 GitHub: https://github.com/[username]/calibr-app

Would love feedback from PMs, recruiters, and anyone in the job search grind.

#ProductManagement #BuildInPublic #AI #OpenToWork #CareerTech #FreshersInTech

---

## POST 2 — The Story Post *(use 3 days later)*

6 months ago I was applying to 40+ companies with the same resume.

Getting rejected. Not knowing why. Applying again.

The cycle was demoralizing — not because of the rejections, but because I had no signal. No feedback. No way to improve.

I realized: every rejection contains career intelligence. You just need a system to extract it.

That became CALIBR.

After 3 weeks of building, here's what I learned about product development that no course teaches:

**1. Empty states are a product decision, not a UI detail.**
Every blank screen is a moment to guide or confuse.

**2. Prompt engineering is product design.**
The quality of an AI feature = how clearly you specify what you want. Exactly like writing a PRD.

**3. Your constraints are your USP.**
No database = forced me to make JSON schema perfect.
Solo project = forced me to ruthlessly prioritize.

**4. Being the user is an unfair advantage.**
I am the exact person CALIBR is built for.
Every design decision came from my own pain.

The product is live. The learning continues.

🔗 https://careercopilot-web.vercel.app?demo=true

#BuildInPublic #ProductManagement #AIProducts #FresherPM #CareerIntelligence

---

## POST 3 — The Technical Post *(use 1 week later)*

How I built an AI system that learns from job rejections — technical breakdown of CALIBR's architecture:

The hardest part wasn't the AI. It was **preventing hallucination.**

Here's the anti-hallucination stack I built:

**1. Closed vocabulary skill list**
All skills validated against a known list.
Unknown skills → flagged, not used in calculations.

**2. Skill normalization layer**
"ML" → "Machine Learning"
"TF" → "TensorFlow"
Prevents the AI from treating the same skill as two different skills.

**3. Structured output enforcement**
Every Groq call ends with:
*"Return ONLY valid JSON. No markdown. No explanation."*
\+ try/except json.loads() on every response.

**4. Living confidence model**
Skills don't just exist — they have a confidence score.
Rejection → score drops. Strong interview → score rises.
Minimum: 10. Maximum: 100. Updated after every event.

**5. Context-aware AI agent**
CALIBR Agent knows which tab you're on, which application you're viewing, and your current profile state.
Every response is grounded in your actual data.

Tech stack: React + TypeScript + FastAPI + Groq + ReportLab
Deployment: Vercel + Render (both free tier)
Total build time: 3 weeks solo

🔗 Live: https://careercopilot-web.vercel.app?demo=true
📂 Code: https://github.com/[username]/calibr-app

#BuildInPublic #AI #Python #React #ProductManagement
