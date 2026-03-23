# CALIBR — Interview Answer Scripts
*PM interview prep — answer every question about CALIBR*

---

## "Tell me about a project you've built."

CALIBR is an AI career intelligence platform I built to solve a problem I faced personally as a fresher — getting rejected from jobs without understanding why.

The core insight was that rejections contain signal that most candidates ignore. So I built a system where you log your rejection feedback, CALIBR extracts the skill gaps using AI, and automatically reduces your confidence scores for those skills. Over time, the system builds a personalized learning roadmap based on the pattern of your rejections.

What I'm most proud of is the **living profile system** — your skill confidence scores update automatically as you apply and get feedback, so you always have an honest view of your actual career readiness, not just what you wrote on your resume.

The product is live at careercopilot-web.vercel.app. I can demo it right now if that would be useful.

---

## "What problem does CALIBR solve?"

There's a specific moment in the job search that nobody talks about: the moment after a rejection, when you have no idea what went wrong.

Most candidates do one of two things — they ignore it and apply again, or they spiral and don't know how to improve.

CALIBR solves the **information problem**. It turns rejection feedback — even vague feedback — into specific skill gaps, updates your profile accordingly, and tells you exactly what to learn next. It closes the loop between applying, failing, and improving.

---

## "How did you decide what to build?"

I started with the user — which is me. I listed every frustration I had with the job search process and found one consistent theme: no feedback loop. Other tools helped me apply. None helped me learn from failure.

From there I did three things:

First, I defined the core user journey: apply → get rejected → understand why → improve → apply better.

Second, I identified the **riskiest assumption**: would AI be able to extract meaningful skill gaps from vague rejection notes? I tested that first before building any UI.

Third, I ruthlessly cut scope. Early versions had 12 features. I shipped with 6 and made sure each one worked perfectly.

---

## "What metrics would you use to measure success?"

My **north star metric** would be interview rate improvement — the percentage increase in interviews a user gets after using CALIBR for 30 days compared to their first 30 days.

Supporting metrics:
- **Rejection analysis rate** — are users actually logging rejections, which is the core behavior we need
- **Skill confidence delta over time** — is the living profile actually changing, or is it static
- **Return rate after first rejection logged** — do users come back after using the core feature

The metric I would **NOT** use as north star: resume downloads. That measures the least differentiated feature. Resume builders already exist. Rejection intelligence doesn't.

---

## "What would you build next?"

The most valuable next feature is **anonymized benchmarking**.

Right now CALIBR tells you your SQL confidence is 65%. It can't tell you if that's good or bad relative to other candidates applying to the same role.

If users opt in to anonymous data sharing, CALIBR could say:
*"Your SQL confidence is 65%. Candidates who got hired at Razorpay had an average of 78%. Here's what they studied."*

That transforms individual intelligence into collective intelligence. That's the **network effect** that makes CALIBR defensible long-term.

---

## "What was the hardest technical decision?"

Preventing AI hallucination in a product where users trust the output to make career decisions.

If CALIBR tells someone their Docker skills are weak when Docker isn't even in the job description, that's harmful.

I solved it with three layers:
1. A **closed vocabulary** — all skills validated against a known list
2. A **normalization function** — "ML" and "Machine Learning" are the same skill
3. **Structured output enforcement** — every AI prompt ends with "Return ONLY valid JSON" and every response goes through a JSON parser with error handling

The rule I follow: if a skill isn't in the job description, CALIBR cannot say you're missing it. No exceptions.

---

## "Why PM? Why not engineering or design?"

Because the hardest part of building CALIBR wasn't the code or the UI. It was the **decisions**.

What to cut. What empty state copy actually helps a confused user versus makes them feel dumb. Whether skill confidence should drop by 8 or 18 after a rejection. What the north star metric should be.

Those are PM decisions. And they determined whether the product was useful or just technically impressive.

I wrote the code because I had to. The decisions I made because that's where I found the most interesting problems.

---

## "Walk me through a product decision you made."

One of the most important decisions was **how much to drop skill confidence after a rejection**.

The options were:
- Drop by a fixed amount (e.g., always -10)
- Let the AI decide the exact drop
- Use a formula based on how often the skill appeared in rejections

I went with option 2 — AI-determined drops per skill, bounded between -5 and -20 per rejection, with a floor of 10% confidence so users never hit zero.

The reasoning: a fixed drop ignores context. If someone is rejected specifically because of weak SQL skills mentioned explicitly in feedback, that should hurt more than a vague rejection. The floor at 10% prevents users from feeling locked out of skills they've spent years on.

The learning: this kind of calibration decision — where you're setting the sensitivity of a feedback model — is deeply PM work. It's about respecting the user's psychology as much as building a fair algorithm.
