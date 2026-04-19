# 🚀 PRGuard Deployment - QUICK START GUIDE

**Status**: ✅ **PRODUCTION READY**  
**Date**: April 19, 2026  
**Deployment Target**: Coolify + Supabase PostgreSQL

---

## TL;DR - DEPLOYMENT IN 3 STEPS

### Step 1: Prepare Supabase
```bash
# Create PostgreSQL database on Supabase
# Copy connection string (Pooler endpoint):
DATABASE_URL=postgresql+asyncpg://postgres:password@db.ref.supabase.co:6543/postgres?sslmode=require
```

### Step 2: Create GitHub OAuth App
```bash
# Go to https://github.com/settings/developers
# Create new OAuth App
# Set Authorization callback URL to:
# https://api.yourdomain.com/auth/github/callback
```

### Step 3: Deploy to Coolify
```bash
# In Coolify, create two services:
# 1. Backend: repository root → backend, start: python run.py
# 2. Frontend: repository root → frontend, start: npm run preview

# Set all environment variables (see below)
# Deploy!
```

---

## REQUIRED ENVIRONMENT VARIABLES

### Backend (Set all)
```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@db.ref.supabase.co:6543/postgres?sslmode=require

# Domains
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
CORS_ORIGINS=https://app.yourdomain.com

# Security (generate with: python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY=<64-char-hex>
JWT_SECRET=<64-char-hex>
SESSION_SECRET=<64-char-hex>

# GitHub OAuth
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_APP_ID=your_app_id
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Environment
ENVIRONMENT=production
PORT=8000

# Optional: LLM (at least one recommended)
GEMINI_API_KEY=your_key
# or ANTHROPIC_API_KEY= or OPENAI_API_KEY=

# Optional: Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<strong-password>
ADMIN_EMAIL=admin@yourdomain.com

# Optional: Redis (remove if not using)
# REDIS_URL=redis://:[password]@host:6379/0
```

### Frontend (Set BEFORE build)
```env
# Must match backend APP_URL
VITE_API_BASE_URL=https://api.yourdomain.com

# Must match GitHub OAuth Client ID
VITE_GITHUB_CLIENT_ID=your_client_id
```

---

## VERIFICATION CHECKLIST

After deployment, verify:

1. **Backend Health**
   ```bash
   curl https://api.yourdomain.com/health
   # Should return: {"status": "ok", "database_connected": true}
   ```

2. **Frontend Loads**
   ```bash
   curl https://app.yourdomain.com | head -5
   # Should return HTML
   ```

3. **OAuth Works**
   - Visit https://app.yourdomain.com
   - Click "Login with GitHub"
   - Should redirect to GitHub OAuth
   - After approval, should see dashboard

4. **Admin Login Works**
   - Visit https://app.yourdomain.com/admin/login
   - Enter admin credentials (from ADMIN_USERNAME/ADMIN_PASSWORD)
   - Should see admin dashboard

5. **Session Persists**
   - Login in Tab 1
   - Open https://app.yourdomain.com in Tab 2
   - Should already be logged in

---

## DETAILED DOCUMENTATION

For complete deployment information, see:

| Document | Purpose |
|----------|---------|
| [COOLIFY_DEPLOYMENT_GUIDE.md](./COOLIFY_DEPLOYMENT_GUIDE.md) | Step-by-step Coolify setup with architecture |
| [DEPLOYMENT_READINESS_CHECKLIST.md](./DEPLOYMENT_READINESS_CHECKLIST.md) | Complete pre/during/post deployment checklist |
| [DEPLOYMENT_READY_FINAL_REPORT.md](./DEPLOYMENT_READY_FINAL_REPORT.md) | Detailed technical findings and risk assessment |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Original deployment notes |

---

## WHAT HAS BEEN VERIFIED ✅

### Infrastructure
- ✅ Async database ORM compatible with Supabase
- ✅ Connection pooling configured
- ✅ SSL/TLS enforcement on database
- ✅ Automatic schema initialization

### OAuth & Security
- ✅ GitHub OAuth flow with CSRF protection
- ✅ State encoding in OAuth URL
- ✅ Secure cookies (httpOnly, Secure, SameSite=None for production)
- ✅ Admin/User session isolation
- ✅ Password hashing for admin credentials

### Configuration
- ✅ CORS properly configured with domain whitelist
- ✅ Environment variables validated at startup
- ✅ Frontend build requires VITE_API_BASE_URL (prevents localhost leakage)
- ✅ Health endpoint for monitoring

### Features
- ✅ OAuth user login
- ✅ Local admin authentication
- ✅ Multi-tab session sharing
- ✅ Session rotation on role change
- ✅ Graceful Redis degradation

---

## TROUBLESHOOTING

### "Database connection failed"
```
Error: DATABASE_URL must be set
```
**Fix**: 
1. Verify DATABASE_URL is set in Coolify environment
2. Check format: postgresql+asyncpg://user:password@host:6543/db?sslmode=require
3. Test connection: psql $DATABASE_URL

### "GitHub OAuth redirect mismatch"
```
Error: redirect_uri_mismatch from GitHub
```
**Fix**:
1. Verify APP_URL is set correctly in Coolify
2. Check GitHub OAuth App has exact callback URL:
   - https://api.yourdomain.com/auth/github/callback

### "CORS error - frontend can't reach backend"
```
Error: Cross-Origin Request Blocked
```
**Fix**:
1. Ensure CORS_ORIGINS includes FRONTEND_URL
2. Restart backend service after changing CORS_ORIGINS
3. Check browser console for exact URL it's trying to reach

### "Redis connection timeout (but app works)"
```
Warning: Redis unavailable, continuing in degraded mode
```
**Fix**: This is OK! If not using Redis, remove REDIS_URL from env vars.
The app works fine with database-backed sessions.

---

## AFTER DEPLOYMENT

### Day 1: Monitoring
- Watch backend logs for errors
- Monitor /health endpoint
- Check for any 5xx errors
- Verify database connections are stable

### Week 1: Optimization
- Review database query performance
- Check Redis usage (if using)
- Verify admin dashboard works
- Test all API endpoints

### Ongoing: Maintenance
- Rotate secrets quarterly
- Monitor database size
- Check error logs monthly
- Keep dependencies updated

---

## GETTING HELP

**Issue**: Application won't start
- Check backend logs in Coolify
- Verify all required env vars are set
- Run health check: curl https://api.yourdomain.com/health

**Issue**: Users can't login
- Check GitHub OAuth credentials in env vars
- Verify APP_URL matches OAuth callback URL
- Check browser console for CORS errors

**Issue**: Admin dashboard shows errors
- Check ADMIN_USERNAME/ADMIN_PASSWORD are strong
- Verify admin_token cookie exists (check Network tab in DevTools)
- Restart backend and try again

---

## SUCCESS INDICATORS ✅

When deployed correctly, you should see:

✅ Backend reports "database_connected": true  
✅ Frontend loads without 404s or CORS errors  
✅ Users can login with GitHub  
✅ Admin can login with credentials  
✅ Sessions persist across tabs  
✅ Health endpoint returns 200 OK  
✅ No 500 errors in logs  
✅ API endpoints working (repos, reviews, chat)

---

## NEXT STEPS

1. **Review all three deployment guides** in this directory
2. **Prepare Supabase database** and get connection string
3. **Create GitHub OAuth App** and get credentials
4. **Set up Coolify project** and create two services
5. **Deploy and test** following the verification checklist
6. **Monitor for 48 hours** after first deployment

---

**Status**: ✅ APPROVED FOR PRODUCTION  
**Prepared by**: Senior Deployment Engineer  
**Date**: April 19, 2026

