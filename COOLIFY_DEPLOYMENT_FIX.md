# COOLIFY DEPLOYMENT FIX GUIDE

**For**: PRGuard on Supabase + Coolify  
**Status**: Application broken due to frontend URL misconfiguration  
**Time to Fix**: 15-30 minutes  

---

## THE PROBLEM IN ONE SENTENCE

The frontend was built with hardcoded `http://127.0.0.1:8000` as the API URL, making it unable to reach the backend when deployed to Coolify.

---

## IMMEDIATE FIXES REQUIRED

### Fix #1: Frontend Build Configuration (Critical)

The frontend **must be rebuilt** with the correct production API URL. This cannot be fixed by changing environment variables after deployment—Vite bakes the URL into the compiled JavaScript at build time.

#### Option A: Use Coolify's Build System (Recommended)

1. **Update frontend environment configuration locally**:
   ```bash
   cd frontend
   
   # Determine your actual backend domain
   # (e.g., if Coolify is serving from https://myapp.example.com/, use that)
   
   # Edit .env with production values
   cat > .env << 'EOF'
   VITE_API_BASE_URL=https://myapp.example.com/
   VITE_GITHUB_CLIENT_ID=your_github_client_id_here
   EOF
   
   # Verify no localhost URLs remain
   grep -r "localhost\|127.0.0.1" . --include="*.env*" || echo "✅ Clean"
   ```

2. **Commit the changes**:
   ```bash
   git add frontend/.env .gitignore
   git commit -m "fix: configure production frontend API URL for Coolify deployment"
   git push origin main
   ```

3. **Trigger Coolify rebuild**:
   - In Coolify dashboard, go to your Frontend Service
   - Click "Redeploy" or "Build & Deploy"
   - Coolify will:
     - Pull latest code from Git
     - Read `frontend/.env` with your production URL
     - Run `npm run build` with VITE_API_BASE_URL baked in
     - Deploy new built assets to production

#### Option B: Manual Rebuild & Upload

1. **Build locally with production URL**:
   ```bash
   cd frontend
   
   # Set production URL
   export VITE_API_BASE_URL=https://myapp.example.com/
   export VITE_GITHUB_CLIENT_ID=your_github_client_id_here
   
   # Build
   npm install
   npm run build
   
   # Verify build has correct URL (should NOT find localhost)
   grep -r "127.0.0.1\|localhost" dist/ && echo "❌ ERROR: Build contains localhost!" || echo "✅ Build is clean"
   ```

2. **Upload `dist/` folder to Coolify**:
   - In Coolify, configure static file serving
   - Upload the entire `frontend/dist/` folder
   - OR use FTP/Git to push built files

---

### Fix #2: Backend Environment Variables (Critical)

The backend startup will fail or behave incorrectly if environment variables aren't set. Configure these in Coolify:

#### In Coolify Dashboard:

1. **Navigate to Backend Service** → Environment Variables (or Settings → Environment)

2. **Add/Update these required variables**:

   ```
   DATABASE_URL=postgresql+asyncpg://user:password@your-supabase-host/dbname?ssl=require
   
   SECRET_KEY=<generate-a-random-64-character-string>
   # Use: openssl rand -hex 32
   
   ENVIRONMENT=production
   
   APP_URL=https://myapp.example.com/
   
   FRONTEND_URL=https://myapp.example.com/
   
   CORS_ORIGINS=https://myapp.example.com/
   
   GITHUB_CLIENT_ID=<from GitHub OAuth App>
   
   GITHUB_CLIENT_SECRET=<from GitHub OAuth App>
   
   GITHUB_APP_ID=<from GitHub App>
   
   GITHUB_WEBHOOK_SECRET=<from GitHub App Webhook settings>
   
   ADMIN_USERNAME=<choose an admin username>
   
   ADMIN_PASSWORD=<choose a strong admin password>
   ```

3. **Optional but recommended**:
   ```
   ADMIN_EMAIL=admin@yourdomain.com
   MODEL_PROVIDER=gemini
   MODEL_NAME=gemini-2.5-flash
   GEMINI_API_KEY=<if you have one>
   CHAT_ENABLE_RAG=false
   ```

4. **Save and Redeploy** the backend service

---

### Fix #3: Verify Deployment (Validation)

#### Test 1: Backend Health Check
```bash
# Should return 200 with database connection status
curl -i https://myapp.example.com/health

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {"status":"ok","database_connected":true,...}
```

#### Test 2: Database Connectivity
```bash
# Should return 200 if database is reachable
curl -i https://myapp.example.com/health/db

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {"status":"ok","database_connected":true,...}
```

#### Test 3: Frontend Loads
- Open `https://myapp.example.com/` in browser
- Should see PRGuard landing page
- Check browser DevTools → Network tab
- Verify API calls go to `https://myapp.example.com/api/*` NOT `http://127.0.0.1:8000/*`

#### Test 4: Login Works
- Click "Login with GitHub" button
- Should redirect to GitHub OAuth page
- After auth, should return to app with user profile loaded
- Check Network tab: API calls should use production domain

#### Test 5: Admin Login Works
- Navigate to `https://myapp.example.com/admin-login` (or equivalent)
- Login with configured ADMIN_USERNAME / ADMIN_PASSWORD
- Should access admin dashboard

---

## CONFIGURATION MATRIX

| Component | Local Dev | Coolify Production |
|-----------|-----------|-------------------|
| **Frontend VITE_API_BASE_URL** | `http://localhost:8000/` | `https://myapp.example.com/` |
| **Frontend VITE_GITHUB_CLIENT_ID** | `dev_app_client_id` | `prod_app_client_id` |
| **Backend APP_URL** | `http://localhost:8000/` | `https://myapp.example.com/` |
| **Backend FRONTEND_URL** | `http://localhost:5173/` | `https://myapp.example.com/` |
| **Backend CORS_ORIGINS** | `http://localhost:5173/` | `https://myapp.example.com/` |
| **Backend ENVIRONMENT** | `development` | `production` |
| **Backend SECRET_KEY** | anything (dev) | Random 64-char (production) |

---

## TROUBLESHOOTING

### Frontend Still Shows "Connection Error"
**Symptom**: Frontend loads but API calls fail  
**Cause**: Frontend still built with localhost URL  
**Fix**:
```bash
# Verify built assets do NOT contain localhost
grep -r "127.0.0.1\|localhost" frontend/dist/

# If found, rebuild frontend and redeploy
git push origin main  # Trigger Coolify rebuild
```

### Backend Starts but Database Connection Fails
**Symptom**: Backend crashes or returns 503 on /health  
**Cause**: DATABASE_URL not set or incorrect  
**Fix**:
1. Check Coolify environment variables (is DATABASE_URL set?)
2. Verify DATABASE_URL format: `postgresql+asyncpg://user:pass@host/db?ssl=require`
3. Test Supabase connection: `psql "postgresql://..."` from terminal
4. Redeploy backend service

### Admin Login Doesn't Work
**Symptom**: Admin credentials rejected at /admin/login  
**Cause**: ADMIN_USERNAME or ADMIN_PASSWORD not set in Coolify  
**Fix**:
1. Verify ADMIN_USERNAME and ADMIN_PASSWORD are set in Coolify
2. Verify they are correct in the database
3. Or re-bootstrap admin: Set ADMIN_USERNAME/PASSWORD and restart backend

### GitHub OAuth Redirects to Blank Page
**Symptom**: After GitHub auth approval, see blank page instead of redirect to app  
**Cause**: GitHub OAuth App redirect URI misconfigured  
**Fix**:
1. In GitHub Settings → Developer Settings → OAuth Apps
2. Find your app
3. Update "Authorization callback URL" to: `https://myapp.example.com/auth/github/callback`
4. Save changes

---

## COMMON MISTAKES

❌ **Mistake 1**: Setting VITE_API_BASE_URL in Coolify after build
- Vite builds JavaScript at compile time, environment variables baked in
- Must be set BEFORE `npm run build` runs
- Solution: Set in frontend/.env or Coolify environment variables

❌ **Mistake 2**: Using http:// instead of https://
- Cookies with SameSite=None require Secure flag
- Secure flag only works with https
- Solution: Use https:// for all URLs

❌ **Mistake 3**: Forgetting trailing slash in VITE_API_BASE_URL
- URLs without trailing slash can cause redirect issues
- Solution: Use `https://domain.com/` not `https://domain.com`

❌ **Mistake 4**: Committing .env.local to git
- .env.local is now in .gitignore, but was previously committed
- Solution: `git rm --cached frontend/.env.local` then commit

---

## STEP-BY-STEP RECOVERY

### For Users Without Admin Access to Coolify Build System:

1. Get the correct backend domain from Coolify admin
2. Update `frontend/.env`:
   ```bash
   VITE_API_BASE_URL=https://correct-domain.com/
   ```
3. Run locally to verify build works:
   ```bash
   cd frontend
   npm run build
   grep -r "127.0.0.1" dist/ || echo "✅ Build clean"
   ```
4. Commit and push: `git push origin main`
5. Ask Coolify admin to trigger backend/frontend redeploy

### For Coolify Admins:

1. **Backend Service**:
   - Go to Environment Variables
   - Set all required vars (see Fix #2 above)
   - Click Redeploy

2. **Frontend Service**:
   - Go to Environment Variables
   - Ensure VITE_API_BASE_URL is set to correct production domain
   - Set VITE_GITHUB_CLIENT_ID to production client ID
   - Click Redeploy (will pull latest .env from git and rebuild)

3. **Verify**:
   - Open https://myapp.example.com/
   - Check DevTools Network tab
   - Verify API calls target production domain

---

## PREVENTION FOR FUTURE DEPLOYMENTS

1. **Never commit .env.local** (.gitignore now protects this)
2. **Use environment-specific .env files**:
   - `.env` - Shared/default values
   - `.env.local` - Dev overrides (git ignored)
   - `.env.production` - Production values (git tracked)
3. **Document in DEPLOYMENT.md** (already done):
   - List all required environment variables
   - Provide example values
   - Explain build-time vs runtime configuration
4. **Always verify built assets**:
   ```bash
   # Before deploying, check that builds don't contain:
   grep -r "localhost\|127.0.0.1\|dev" dist/ || true
   ```

---

## SUMMARY

| Step | Action | Status |
|------|--------|--------|
| 1 | Update `frontend/.env` with production URL | ✅ Done |
| 2 | Update `.gitignore` to protect `.env.local` | ✅ Done |
| 3 | Set backend environment variables in Coolify | ⚠️ Your Turn |
| 4 | Rebuild/redeploy frontend in Coolify | ⚠️ Your Turn |
| 5 | Redeploy backend service in Coolify | ⚠️ Your Turn |
| 6 | Verify health endpoints respond | ⚠️ Your Turn |
| 7 | Test login and API calls | ⚠️ Your Turn |

**After completing steps 3-7, application should be live.**
