# Supabase PostgreSQL Setup Guide

This guide aligns PRGuard for Supabase-only production deployment.

## 1. Create Supabase Project
1. Sign in to Supabase.
2. Create project `prguard`.
3. Copy the direct Postgres connection string.

Expected format:

```env
postgresql+asyncpg://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

## 2. Configure Backend Environment

Update `backend/.env` to contain only:

```env
DATABASE_URL=postgresql+asyncpg://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require
SECRET_KEY=<strong-random-secret>
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
GITHUB_CLIENT_ID=<github-client-id>
GITHUB_CLIENT_SECRET=<github-client-secret>
```

## 3. Configure Frontend Environment

Set `frontend/.env.local`:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

## 4. Validate Runtime
1. Start backend from `backend/` with `python run.py`.
2. Open `GET /health` and confirm:
   - `database_connected=true`
   - `database_target` shows `supabase.co` host.
3. Build frontend with `npm run build` in `frontend/`.

## 5. Validate Auth Isolation
1. User signs in through GitHub OAuth.
2. `GET /auth/me` returns authenticated user payload.
3. Admin signs in through `/admin/login`.
4. User and admin sessions stay isolated.

## Troubleshooting
- Connection failures: verify project ref, password, and SSL requirement in `DATABASE_URL`.
- Cookie issues: ensure HTTPS in production and frontend/backend origins are correct.
- Login loops: confirm `VITE_API_BASE_URL` points to backend and requests include credentials.
