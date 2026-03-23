import sys, os, json
sys.path.append('careercopilot-api')
from dotenv import load_dotenv
load_dotenv('careercopilot-api/.env')
from groq import Groq
client = Groq()

def call_groq_json(prompt):
    res = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"}
    )
    content = res.choices[0].message.content
    try:
        return json.loads(content)
    except Exception as e:
        print("Failed to parse JSON:", content)
        return {"error": str(e), "raw": content}

# Setup Mock Data based on User Request
role = "Associate Product Manager"
company = "Razorpay"
jd_text = "Associate PM for payments infrastructure. Deep understanding of payment systems, APIs, and fintech products. Must have strong data-driven decision making. Ability to define product vision. Strong SQL skills required. Experience with A/B testing and competitive analysis."
profile = {"name": "Manpreet Singh", "skills": ["Product Management", "PRD Writing", "SQL", "Figma", "A/B Testing", "User Research", "Competitive Analysis", "Agile"], "experience": [{"company": "CALIBR", "role": "PM Intern", "description": "Built features for AI resume platform. Tracked applications. Detected skills. Did research."}]}

# STEP 1: JD Parser
print("\n--- STEP 1: JD Parser ---")
prompt_jd = f"""Analyze this job description for {role} at {company}.
JD: {jd_text}
Return ONLY valid JSON:
{{
  "must_have_skills": ["max 8"],
  "nice_to_have_skills": ["max 5"],
  "key_action_verbs": ["e.g. define, conduct"],
  "exact_phrases_to_mirror": ["max 6 exact phrases"],
  "company_priorities": [""],
  "role_level": "junior",
  "domain": "string"
}}"""
jd_analysis = call_groq_json(prompt_jd)
print("JD Must-Haves:", jd_analysis.get('must_have_skills'))
print("Exact Phrases:", jd_analysis.get('exact_phrases_to_mirror'))

# STEP 2: Skill Gap Bridge
print("\n--- STEP 2: Skill Gap Bridge ---")
prompt_bridge = f"""Given this candidate profile: {json.dumps(profile)}
And these required skills: {json.dumps(jd_analysis.get('must_have_skills', []))}
For each required skill, find the best evidence from the candidate's actual experience.
Return ONLY valid JSON:
{{
  "skill_evidence": [
    {{
      "skill": "string",
      "has_directly": true,
      "best_evidence": "specific bullet",
      "strength": "strong"
    }}
  ]
}}"""
skill_evidence_res = call_groq_json(prompt_bridge)
skill_evidence = skill_evidence_res.get('skill_evidence', [])

# STEP 3 & 4: Generate and Score Loop
print("\n--- STEP 3: Resume Generation ---")
max_retries = 2
best_resume = None
best_score_data = None

for attempt in range(max_retries + 1):
    print(f"\nAttempt {attempt + 1}...")
    
    prompt_gen = f"""SYSTEM: You are a world-class PM resume writer. You write resumes that pass ATS filters AND impress human reviewers. Your resumes are specific, honest, and ruthlessly tailored.

USER: Write a resume for {profile['name']} applying to {role} at {company}.
CANDIDATE PROFILE: {json.dumps(profile)}
JD ANALYSIS:
Must-have skills: {json.dumps(jd_analysis.get('must_have_skills', []))}
Key phrases to mirror: {json.dumps(jd_analysis.get('exact_phrases_to_mirror', []))}
Company priorities: {json.dumps(jd_analysis.get('company_priorities', []))}
Key action verbs: {json.dumps(jd_analysis.get('key_action_verbs', []))}
SKILL EVIDENCE AVAILABLE: {json.dumps(skill_evidence)}

GENERATION RULES:
RULE 1: MIRROR JD LANGUAGE. Use the exact phrases from exact_phrases_to_mirror verbatim.
RULE 2: LEAD WITH TOP PRIORITY. The first must_have skill goes in summary and first bullet.
RULE 3: PROVE EVERY CLAIM. Format: [Action verb] + [specific project] + [specific outcome] + [why it mattered].
RULE 4: QUANTIFY EVERYTHING.
RULE 5: USE JD ACTION VERBS.
RULE 6: ZERO FILLER PHRASES. 'Utilized skills in X', 'Applied knowledge of Y' are banned.
RULE 7: HONEST ONLY.
RULE 8: STRUCTURE FOR ATS + HUMAN. Summary: 3 sentences. Experience bullets: 5-7 bullets total.

Return ONLY valid JSON.
{{
  "summary": "string",
  "skills_ordered": ["must-haves first, max 14"],
  "experience_bullets": [
    {{
      "project": "string",
      "bullet": "string",
      "jd_skill_proven": "string"
    }}
  ],
  "projects": [
    {{
      "name": "string",
      "tagline": "string",
      "impact_bullets": ["3 specific bullets with numbers"]
    }}
  ],
  "why_this_company": "string"
}}"""
    
    generated_resume = call_groq_json(prompt_gen)
    
    # STEP 4: Scoring
    prompt_score = f"""You are a strict ATS system and a senior recruiter. Score this resume against this JD.
Resume: {json.dumps(generated_resume)}
JD Must-have skills: {json.dumps(jd_analysis.get('must_have_skills', []))}
JD Exact phrases: {json.dumps(jd_analysis.get('exact_phrases_to_mirror', []))}

Return ONLY valid JSON:
{{
  "ats_score": 85,
  "human_score": 80,
  "missing_keywords": [],
  "weak_bullets": [],
  "pass": true
}}"""
    score_data = call_groq_json(prompt_score)
    print(f"ATS: {score_data.get('ats_score')}, Human: {score_data.get('human_score')}, Pass: {score_data.get('pass')}")
    
    best_resume = generated_resume
    best_score_data = score_data
    if score_data.get('pass'):
        print("Passed ATS thresholds!")
        break
    else:
        print("Missing Keywords:", score_data.get('missing_keywords'))
        print("Weak Bullets:", score_data.get('weak_bullets'))

print("\n\n--- RESULTS TO PRESENT TO USER ---")
print("Self-Scoring Result:")
print(json.dumps({
    "ats_score": best_score_data.get("ats_score"),
    "human_score": best_score_data.get("human_score"),
    "keywords_matched": f"{len(jd_analysis.get('must_have_skills', [])) - len(best_score_data.get('missing_keywords', []))}/{len(jd_analysis.get('must_have_skills', []))}"
}, indent=2))
print("\nFirst 3 Bullets:")
bullets = best_resume.get("experience_bullets", [])
for b in bullets[:3]:
    print(f"- {b['bullet']}")
