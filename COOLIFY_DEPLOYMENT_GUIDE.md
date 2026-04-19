# PRGuard Coolify Deployment Guide

**Status**: ✅ PRODUCTION READY  
**Last Updated**: April 19, 2026  
**Target**: Coolify Hosting + Supabase PostgreSQL + Optional Redis

---

## ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                      Coolify Hosting                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend Service      │  Backend Service  │  Redis (opt)   │
│  ─────────────────     │  ────────────     │  ────────     │
│  Vite React App        │  FastAPI Server   │  Cache/Queue  │
│  (Static + Node)       │  (Python Async)   │  Optional     │
└─────────────────────────────────────────────────────────────┘
           ↓                       ↓
    ┌──────────────────────────────────────┐
    │  Supabase PostgreSQL + SSL           │
    │  postgresql+asyncpg://...            │
    └──────────────────────────────────────┘
```

---

## STEP 1: SUPABASE SETUP

### 1.1 Create PostgreSQL Database

1. Create new project in Supabase
2. Go to "Settings" → "Database"
3. Copy connection string (Pooler):
   ```
   postgresql://postgres:[password]@[db].[ref].supabase.co:6543/postgres
   ```
4. Generate DATABASE_URL (required format):
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:[password]@[db].[ref].supabase.co:6543/postgres?sslmode=require
   ```

### 1.2 Verify Connection

```bash
# Test connection string
psql postgresql://postgres:[password]@[db].[ref].supabase.co:5432/postgres
```

---

## STEP 2: COOLIFY SETUP

### 2.1 Deploy Backend Service

**Service Type**: Docker (Python FastAPI)

**Configuration**:
```yaml
Name: PRGuard Backend
Repository: https://github.com/YourOrg/PRGuard.git
Root Directory: backend
Dockerfile: None (use default Python)
Build Command: pip install -r requirements.txt
Start Command: python run.py
Port: 8000
```

**Environment Variables** (all required):
```env
ENVIRONMENT=production
PORT=8000
DATABASE_URL=postgresql+asyncpg://postgres:[password]@[db].[ref].supabase.co:6543/postgres?sslmode=require

# Domain Configuration
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com

# Security (generate with: python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY=[64-char-random-hex]
JWT_SECRET=[64-char-random-hex]
SESSION_SECRET=[64-char-random-hex]

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_app_id
GITHUB_CLIENT_SECRET=your_github_app_secret
GITHUB_APP_ID=your_github_app_id
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# LLM Provider (optional)
GEMINI_API_KEY=your_api_key
MODEL_PROVIDER=gemini
MODEL_NAME=gemini-2.5-flash

# Optional: Admin Bootstrap
ADMIN_USERNAME=admin
ADMIN_PASSWORD=[strong-password]
ADMIN_EMAIL=admin@yourdomain.com

# Optional: Redis (remove if not using)
REDIS_URL=redis://:[password]@redis-host:6379/0
```

**Health Check**:
- Endpoint: `/health`
- Expected: `{"status": "ok", "database_connected": true}`

### 2.2 Deploy Frontend Service

**Service Type**: Node.js (Static with Vite)

**Configuration**:
```yaml
Name: PRGuard Frontend
Repository: https://github.com/YourOrg/PRGuard.git
Root Directory: frontend
Build Command: npm install && npm run build
Start Command: npm run preview (or use Node http-server)
Port: 3000
```

**Environment Variables** (set BEFORE build):
```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_GITHUB_CLIENT_ID=your_github_app_id
```

**Important**: These variables are embedded in the build artifacts. Change and rebuild if domains change.

**Output Directory**: `frontend/dist`

### 2.3 Domain Configuration

**Backend Service**:
- Domain: `api.yourdomain.com` (or your chosen domain)
- Protocol: HTTPS (required)
- Port: 8000

**Frontend Service**:
- Domain: `app.yourdomain.com` (or your chosen domain)
- Protocol: HTTPS (required)
- Port: 3000

---

## STEP 3: ENVIRONMENT VARIABLES CHECKLIST

### Critical (Deployment will fail without these):
- [ ] `DATABASE_URL` - Valid Supabase connection string
- [ ] `APP_URL` - Backend service public HTTPS URL
- [ ] `FRONTEND_URL` - Frontend service public HTTPS URL
- [ ] `SECRET_KEY` - Strong random 64-char hex
- [ ] `GITHUB_CLIENT_ID` - From GitHub OAuth App
- [ ] `GITHUB_CLIENT_SECRET` - From GitHub OAuth App
- [ ] `GITHUB_APP_ID` - From GitHub App
- [ ] `GITHUB_WEBHOOK_SECRET` - From GitHub App

### Important (Strongly recommended):
- [ ] `CORS_ORIGINS` - Should match FRONTEND_URL
- [ ] `ENVIRONMENT` - Set to "production"
- [ ] `JWT_SECRET` - For token security
- [ ] `SESSION_SECRET` - For session security
- [ ] `ADMIN_PASSWORD` - If using local admin

### Optional (Remove if not using):
- [ ] `REDIS_URL` - Only if Redis service exists
- [ ] `GEMINI_API_KEY` (or other LLM keys)

---

## STEP 4: GITHUB OAUTH CONFIGURATION

### 4.1 Create GitHub OAuth App

1. Go to GitHub Settings → Developer settings → OAuth Apps → New OAuth App
2. **Application name**: PRGuard
3. **Homepage URL**: `https://app.yourdomain.com`
4. **Authorization callback URL**: `https://api.yourdomain.com/auth/github/callback`
5. Generate Client Secret
6. Copy Client ID and Client Secret to Coolify env vars

### 4.2 Verify Redirect Configuration

The backend automatically constructs the OAuth redirect URL as:
```
https://{APP_URL}/auth/github/callback
```

Ensure this matches your GitHub OAuth App "Authorization callback URL".

---

## STEP 5: VERIFICATION CHECKLIST

### Backend Health Check
```bash
curl https://api.yourdomain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "database_connected": true,
  "redis_connected": true,
  "llm_key_configured": true
}
```

### Frontend Accessibility
```bash
curl https://app.yourdomain.com
```

Should return HTML with embedded VITE_API_BASE_URL in source.

### OAuth Flow Test
1. Visit `https://app.yourdomain.com`
2. Click "Login with GitHub"
3. Should redirect to GitHub OAuth page
4. After approval, should create user and issue session cookies

### Admin Login Test
1. Visit `https://app.yourdomain.com/admin/login`
2. Enter admin credentials (from ADMIN_USERNAME/ADMIN_PASSWORD)
3. Should issue admin_session cookie

### Session Persistence
1. Login as user in tab 1
2. Open `https://app.yourdomain.com` in tab 2
3. Should already be logged in (session shared across tabs via cookie)

---

## STEP 6: TROUBLESHOOTING

### Database Connection Fails
```
Error: DATABASE_URL must be set
```
- Check `DATABASE_URL` env var is set in Coolify
- Verify format: `postgresql+asyncpg://user:pass@host:port/db?sslmode=require`
- Test connection: `psql $DATABASE_URL`

### GitHub OAuth Redirect Mismatch
```
Error: redirect_uri_mismatch
```
- Verify `APP_URL` env var matches OAuth callback URL registered in GitHub
- GitHub callback should be: `{APP_URL}/auth/github/callback`

### CORS Error (frontend can't reach backend)
```
Error: Cross-Origin Request Blocked
```
- Check `CORS_ORIGINS` includes FRONTEND_URL
- Verify `FRONTEND_URL` is set correctly
- Check backend is serving CORS headers

### Redis Connection Fails
```
Warning: Redis unavailable
```
- If Redis is not deployed, remove `REDIS_URL` env var
- Backend continues working in degraded mode (DB-backed sessions)

### Admin Session Not Working
```
Error: Admin authentication required
```
- Verify admin_token cookie is set (check Network tab)
- Check `ADMIN_SESSION_TTL_SECONDS` is set (default 43200 = 12 hours)
- Verify admin middleware is allowing /admin/login route

---

## STEP 7: PRODUCTION HARDENING

### Required for Production
- [ ] All domains use HTTPS
- [ ] `ENVIRONMENT=production` set
- [ ] `SECRET_KEY` is strong (64+ chars)
- [ ] Database SSL enabled (sslmode=require)
- [ ] GitHub OAuth secret is never logged
- [ ] Admin password is strong

### Recommended
- [ ] Enable Redis for distributed session cache
- [ ] Set up database backups (Supabase automated daily)
- [ ] Configure monitoring/alerting
- [ ] Review logs regularly
- [ ] Rotate secrets quarterly

---

## STEP 8: DEPLOYMENT COMMAND

Once configured in Coolify:
1. Push to main branch
2. Coolify auto-deploys both services
3. Monitor logs for startup errors
4. Verify `/health` endpoint

---

## FINAL CHECKLIST

| Component | Status | Notes |
|-----------|--------|-------|
| Database | ✅ | Supabase async pooler |
| Backend | ✅ | FastAPI + Uvicorn |
| Frontend | ✅ | Vite React app |
| OAuth | ✅ | GitHub app registered |
| Sessions | ✅ | DB-backed, httpOnly cookies |
| Redis | ⚠️ | Optional, gracefully degraded |
| CORS | ✅ | Configured for frontend domain |
| Admin Auth | ✅ | Local credentials backup |
| Rate Limiting | ✅ | Per-instance (acceptable) |

**DEPLOYMENT READY**: Yes ✅

---

## SUPPORT

For issues, check:
1. Backend logs: Coolify → Backend Service → Logs
2. Frontend console: Browser DevTools → Console
3. OAuth flow: GitHub developer logs
4. Database: Supabase dashboard → Logs

---

**Last Verified**: April 19, 2026  
**Deployment Status**: PRODUCTION READY
