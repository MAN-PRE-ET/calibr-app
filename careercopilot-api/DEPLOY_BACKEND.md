# Deploy CALIBR Backend to Render

## Prerequisites
- GitHub account with CALIBR repo pushed
- Render account (render.com — free)
- Groq API key (console.groq.com — free tier)

## Steps

### 1. Push backend to GitHub
```bash
# From project root
git add . && git commit -m "add render.yaml" && git push
```

### 2. Create Web Service on Render
1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo: `calibr-app`
3. Configure:
   - **Name**: `calibr-api`
   - **Region**: Choose closest to users (Oregon / Singapore)
   - **Root Directory**: `careercopilot-api`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free

### 3. Add Environment Variables
In Render service → **Environment** tab:
| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | `your_groq_api_key_here` |
| `DATA_FILE` | `calibr_data.json` |

### 4. Deploy
Click **Create Web Service** → Build starts automatically.

Wait ~5 minutes for first deploy → Get URL like:
```
https://calibr-api.onrender.com
```

### 5. Test Health Check
```
GET https://calibr-api.onrender.com/health
```
Expected response:
```json
{ "status": "ok", "version": "1.0.0", "app": "CALIBR" }
```

## ⚠️ Free Tier Spin-Down
Render free tier spins down after **15 minutes** of inactivity.
First request after spin-down takes ~30 seconds.

**Fix**: Set up UptimeRobot (free) to ping `/health` every 14 minutes:
1. Go to [uptimerobot.com](https://uptimerobot.com) → Sign up free
2. New Monitor → HTTP(S)
3. URL: `https://calibr-api.onrender.com/health`
4. Interval: **14 minutes**
5. Done — your backend stays warm 24/7.

Alternatively, run `keep_alive.py` locally when demonstrating:
```bash
python keep_alive.py
```

## Update frontend to point to this URL
In Vercel → Environment Variables:
```
VITE_API_BASE = https://calibr-api.onrender.com
```
(Already set if you followed DEPLOY_FRONTEND.md)
