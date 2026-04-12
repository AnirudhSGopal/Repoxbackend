import { useContext, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ThemeContext } from '../App'
import { getStyles } from './Login'
import {
  getAdminApiKeysStatus,
  getAdminLogs,
  getAdminUsers,
  getHealth,
} from '../api/client'
import { useAuth } from '../hooks/useAuth'

const getAdminStyles = (theme) => {
  const dark = theme === 'dark'
  return `
    .admin-sub {
      font-size: 11px;
      color: ${dark ? '#555555' : '#888888'};
      margin: 0 0 16px;
      line-height: 1.6;
      font-family: 'JetBrains Mono', monospace;
    }

    .admin-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: ${dark ? '#666666' : '#777777'};
    }

    .admin-panel {
      border: 1px solid ${dark ? '#242424' : '#eee7dc'};
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
      background: ${dark ? '#121212' : '#fcfbf8'};
    }

    .admin-panel h3 {
      margin: 0 0 9px;
      font-size: 12px;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${dark ? '#9ca3af' : '#6b7280'};
    }

    .admin-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .admin-row {
      display: grid;
      grid-template-columns: minmax(80px, 1.1fr) minmax(60px, 0.7fr) minmax(80px, 1fr);
      gap: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: ${dark ? '#d1d5db' : '#374151'};
      padding: 6px 8px;
      border-radius: 8px;
      background: ${dark ? '#0e0e0e' : '#f6f2ea'};
      border: 1px solid ${dark ? '#1d1d1d' : '#ebe4d8'};
      word-break: break-word;
    }

    .admin-row.logs {
      grid-template-columns: minmax(68px, 0.8fr) minmax(80px, 1fr) minmax(52px, 0.6fr) minmax(120px, 1.6fr);
    }

    .admin-status-ok { color: #22c55e; font-weight: 600; }
    .admin-status-fail { color: #ef4444; font-weight: 600; }

    .admin-error {
      margin: 0 0 12px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #ef4444;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.28);
      border-radius: 8px;
      padding: 8px 10px;
    }

    .admin-empty {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: ${dark ? '#777777' : '#888888'};
      padding: 6px 2px;
    }

    @media (max-width: 760px) {
      .admin-row,
      .admin-row.logs {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }
  `
}

const formatTime = (value) => {
  if (!value) return 'n/a'
  const dt = new Date(value)
  if (Number.isNaN(dt.getTime())) return 'n/a'
  return dt.toLocaleString()
}

export default function Admin() {
  const { theme, toggleTheme } = useContext(ThemeContext)
  const { loading: authLoading, isAuthenticated, user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [users, setUsers] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [logs, setLogs] = useState([])
  const [health, setHealth] = useState(null)

  const mountedClass = useMemo(() => (loading ? '' : 'visible'), [loading])

  const loadAdminData = async () => {
    try {
      setError('')
      const [usersRes, keysRes, logsRes, healthRes] = await Promise.all([
        getAdminUsers(),
        getAdminApiKeysStatus(),
        getAdminLogs(),
        getHealth(),
      ])
      setUsers(usersRes?.users || [])
      setApiKeys(keysRes?.items || [])
      setLogs(logsRes?.requests || [])
      setHealth(healthRes || null)
    } catch (err) {
      const message = err?.response?.data?.detail || err?.message || 'Failed to load admin dashboard data.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user?.is_admin) return

    loadAdminData()
    const id = window.setInterval(loadAdminData, 10000)
    return () => window.clearInterval(id)
  }, [authLoading, isAuthenticated, user?.is_admin])

  if (authLoading) {
    const dark = theme === 'dark'
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: dark ? '#0d0f12' : '#f8f5ef',
          color: dark ? '#6b7280' : '#4b5563',
        }}
      >
        Loading...
      </div>
    )
  }

  if (!isAuthenticated || !user?.is_admin) {
    return <Navigate to="/login" replace />
  }

  return (
    <>
      <style>{getStyles(theme) + getAdminStyles(theme)}</style>
      <div className="auth-root">
        <div className="auth-grid" />
        <div className="auth-glow" />
        <div className="auth-glow-2" />

        <nav className="auth-navbar">
          <div className="nav-logo">
            <div className="nav-logo-icon">PG</div>
            <span className="nav-logo-name">PRGuard</span>
          </div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '☀' : '◑'}
          </button>
        </nav>

        <div className={`auth-card ${mountedClass}`}>
          <div className="auth-logo">
            <div className="auth-logo-icon">PG</div>
            <span className="auth-logo-name">PRGuard</span>
          </div>

          <div className="rag-badge">
            <span className="rag-badge-dot" />
            Internal Admin Dashboard
          </div>

          <h1 className="auth-heading">
            Admin debug console.<br />
            <span className="accent">Internal visibility only.</span>
          </h1>

          <p className="admin-sub">
            Auto-refreshing every 10 seconds. Data includes users, key status, chat activity, and system health.
          </p>

          {error ? <p className="admin-error">{error}</p> : null}

          <div className="admin-meta">
            <span>Signed in as {user?.login}</span>
            <button className="github-btn" style={{ width: 'auto', padding: '8px 12px', fontSize: 12 }} onClick={loadAdminData}>Refresh now</button>
          </div>

          <section className="admin-panel">
            <h3>Section 1 - Users</h3>
            <div className="admin-list">
              {users.length === 0 ? <div className="admin-empty">No user data available.</div> : users.map((item) => (
                <div key={item.user_id} className="admin-row">
                  <span>id: {item.user_id}</span>
                  <span>status: {item.login_status}</span>
                  <span>last: {formatTime(item.last_activity)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <h3>Section 2 - API Key Status</h3>
            <div className="admin-list">
              {apiKeys.length === 0 ? <div className="admin-empty">No API key telemetry yet.</div> : apiKeys.map((item) => (
                <div key={`${item.user_id}-${item.provider}`} className="admin-row">
                  <span>{item.username}: {item.status}</span>
                  <span>{item.provider}</span>
                  <span>{item.masked_key} ({item.validation_result})</span>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <h3>Section 3 - Chat System Status</h3>
            <div className="admin-list">
              {logs.length === 0 ? <div className="admin-empty">No chat requests recorded.</div> : logs.slice(0, 8).map((item, idx) => (
                <div key={`${item.timestamp}-${idx}`} className="admin-row logs">
                  <span>{item.username}</span>
                  <span>{item.repo}</span>
                  <span className={item.status === 'success' ? 'admin-status-ok' : 'admin-status-fail'}>{item.status}</span>
                  <span>{item.error || 'none'}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <h3>Section 4 - System Health</h3>
            <div className="admin-list">
              <div className="admin-row">
                <span>database configured</span>
                <span className={health?.database_url_configured ? 'admin-status-ok' : 'admin-status-fail'}>{health?.database_url_configured ? 'yes' : 'no'}</span>
                <span>{health?.service || 'PRGuard'}</span>
              </div>
              <div className="admin-row">
                <span>llm key configured</span>
                <span className={health?.llm_key_configured ? 'admin-status-ok' : 'admin-status-fail'}>{health?.llm_key_configured ? 'yes' : 'no'}</span>
                <span>provider key presence</span>
              </div>
              <div className="admin-row">
                <span>env loaded</span>
                <span className={health?.env_loaded ? 'admin-status-ok' : 'admin-status-fail'}>{health?.env_loaded ? 'yes' : 'no'}</span>
                <span>required variables</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
