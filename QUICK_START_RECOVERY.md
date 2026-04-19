# QUICK START: Application Recovery (15 Minutes)

**Problem**: Frontend built with hardcoded localhost URL  
**Solution**: Rebuild frontend with production URL + set backend environment variables

---

## In 3 Steps:

### STEP 1: Fix Frontend Configuration (1 min)
```bash
cd frontend

# Replace localhost with YOUR production domain in .env
# Change this line:
#   VITE_API_BASE_URL=https://YOUR_DOMAIN_HERE/
#   VITE_GITHUB_CLIENT_ID=YOUR_CLIENT_ID_HERE

nano .env  # or editor of choice
# Save and close
```

### STEP 2: Commit Changes (1 min)
```bash
cd ..
git add frontend/.env .gitignore
git commit -m "fix: set production API URL"
git push origin main
```

### STEP 3: Redeploy in Coolify (10+ min)

**For Backend Service**:
1. Go to Coolify Dashboard → Backend Service → Environment Variables
2. Ensure these are set:
   - `DATABASE_URL=<your-supabase-url>`
   - `SECRET_KEY=<random-64-chars>` (use: `openssl rand -hex 32`)
   - `ENVIRONMENT=production`
   - `GITHUB_CLIENT_ID=<value>`
   - `GITHUB_CLIENT_SECRET=<value>`
   - `APP_URL=https://YOUR_DOMAIN_HERE/`
   - `FRONTEND_URL=https://YOUR_DOMAIN_HERE/`
   - `ADMIN_USERNAME=<value>`
   - `ADMIN_PASSWORD=<value>`
3. Click **Redeploy**

**For Frontend Service**:
1. Go to Coolify Dashboard → Frontend Service
2. Click **Redeploy** (will pull latest code with fixed .env)
3. Wait for build to complete

### STEP 4: Verify (1 min)
```bash
# Test backend
curl https://YOUR_DOMAIN_HERE/health
# Should return: {"status":"ok","database_connected":true,...}

# Open in browser
https://YOUR_DOMAIN_HERE/
# Should load frontend
# Click Login → should work
```

---

## What Was Wrong?

**File**: `frontend/dist/assets/index-B7tyoQ6s.js`  
**Problem**: Contains `Ba=`http://127.0.0.1:8000`` (hardcoded localhost)  
**Why**: Built from `.env.local` with development URL  
**Fix**: Rebuild with production `.env`

---

## What Changed?

| File | Change | Why |
|------|--------|-----|
| `frontend/.env.local` | Added warning + template | Prevent accidental localhost in builds |
| `frontend/.env` | Added production structure | Make it clear what needs to be set |
| `.gitignore` | Added `frontend/.env.local` | Prevent dev env files from being committed |
| `DEPLOYMENT.md` | Complete rewrite | Updated for Supabase + Coolify (was old) |

---

## Troubleshooting

**Frontend still shows errors?**
```bash
# Verify build is clean (no localhost)
grep -r "127.0.0.1\|localhost" frontend/dist/

# If found, rebuild
git push origin main
# Wait for Coolify rebuild to complete
# Hard refresh browser: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
```

**Backend health check fails?**
```bash
# Check DATABASE_URL is valid
# Check SECRET_KEY is set
# Check logs in Coolify for exact error
```

**Login doesn't work?**
```bash
# Verify GitHub OAuth Client ID/Secret are correct
# Check: GitHub Settings → OAuth Apps → find app → verify Client ID/Secret match
# Verify: Callback URL set to https://YOUR_DOMAIN_HERE/auth/github/callback
```

---

## Full Documentation

For complete details, see:
- `FAILURE_AUDIT_REPORT.md` - What was wrong (8 phases of analysis)
- `COOLIFY_DEPLOYMENT_FIX.md` - Step-by-step fixes with explanations
- `DEPLOYMENT.md` - Full deployment guide for Supabase + Coolify
