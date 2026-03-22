# Deploy CALIBR Frontend to Vercel

## Prerequisites
- GitHub account with CALIBR repo pushed
- Vercel account (vercel.com — free)

## Steps

### 1. Push code to GitHub
```bash
git init
git add .
git commit -m "CALIBR v1.0 — initial deploy"
git remote add origin https://github.com/<your-username>/calibr-app.git
git push -u origin main
```

### 2. Import to Vercel
1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Click **Import** next to your `calibr-app` repository
3. Framework preset: **Vite** (should auto-detect)
4. Root directory: `careercopilot-web` (change from default)
5. Build command: `npm run build`
6. Output directory: `dist`

### 3. Add Environment Variable
In Vercel project settings → **Environment Variables**:
| Key | Value |
|-----|-------|
| `VITE_API_BASE` | `https://calibr-api.onrender.com` |

### 4. Deploy
Click **Deploy** → Wait ~2 minutes → Get URL like:
```
https://calibr-app.vercel.app
```

### 5. Test Demo URL
Open: `https://calibr-app.vercel.app?demo=true`

You should see a toast: *"Welcome to CALIBR! Loaded with sample data."*

## Redeploy after changes
```bash
git add . && git commit -m "update" && git push
# Vercel auto-deploys on push
```

## Custom Domain (optional)
Vercel Dashboard → Domains → Add your domain → Follow DNS instructions.
