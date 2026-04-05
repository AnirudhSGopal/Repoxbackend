import { useContext, useState, useEffect } from 'react'
import { ThemeContext } from '../App'
import { getTheme } from '../utils/helpers'

const PROVIDERS = [
  { id: 'claude', label: 'Claude Sonnet',  sub: 'Anthropic · Best for code' },
  { id: 'gpt4o',  label: 'GPT-4o',         sub: 'OpenAI · Most popular'      },
  { id: 'gemini', label: 'Gemini 1.5 Pro', sub: 'Google · Free tier'         },
]

export default function RepoList({ repos, selectedRepo, onSelectRepo, onConnectClick, loading }) {
  const { theme } = useContext(ThemeContext)
  const t = getTheme(theme)
  const dark = theme === 'dark'

  const [activeProvider, setActiveProvider] = useState('claude')
  const [hasKey,         setHasKey]         = useState(false)

  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem('prguard_provider')
      const key   = localStorage.getItem('prguard_apikey')
      if (saved) setActiveProvider(saved)
      setHasKey(!!key)
    }
    read()
    window.addEventListener('storage', read)
    const interval = setInterval(read, 500)
    return () => { window.removeEventListener('storage', read); clearInterval(interval) }
  }, [])

  const providerLabel = PROVIDERS.find(p => p.id === activeProvider)?.label ?? 'No provider'

  if (loading) return (
    <div className="space-y-1 p-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-12 rounded animate-pulse" style={{ background: t.bg3 }} />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col h-full">

      {/* Provider display */}
      <div style={{ borderBottom: `1px solid ${t.border}` }}>
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: t.bg2 }}>
          <div className="flex items-center gap-2">
            <span style={{ color: hasKey ? '#22c55e' : '#f59e0b', fontSize: 7 }}>●</span>
            <span className="text-[11px] font-medium" style={{ color: t.accentText }}>{providerLabel}</span>
          </div>
          <span
            className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded"
            title="Change LLM provider"
            onClick={() => window.dispatchEvent(new CustomEvent('prguard:openApiPanel'))}
            style={{ color: dark ? '#94a3b8' : '#555', background: dark ? '#1e2a3a' : '#e8e8e8', border: `1px solid ${dark ? '#2a3a50' : '#d0d0d0'}`, cursor: 'pointer', userSelect: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = dark ? '#2a3a50' : '#d8d8d8'; e.currentTarget.style.color = dark ? '#e2e8f0' : '#333' }}
            onMouseLeave={e => { e.currentTarget.style.background = dark ? '#1e2a3a' : '#e8e8e8'; e.currentTarget.style.color = dark ? '#94a3b8' : '#555' }}
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              <path d="M4.93 4.93a10 10 0 0 0 0 14.14"/>
            </svg>
            change
          </span>
        </div>
      </div>

      {/* Repo list */}
      <div className="flex-1 overflow-y-auto">
        {repos.map(repo => {
          const isActive = selectedRepo === repo.name
          return (
            <div
              key={repo.id}
              onClick={() => onSelectRepo(repo.name)}
              className="px-3 py-2.5 cursor-pointer border-l-2 transition-all"
              style={{ borderLeftColor: isActive ? t.accent : 'transparent', background: isActive ? (dark ? '#1a2030' : '#fef3c7') : 'transparent' }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.bg3 }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
            >
              <div className="text-xs font-medium mb-1 truncate" style={{ color: isActive ? t.accentText : t.text2 }}>
                {repo.name}
              </div>
              <div className="flex items-center gap-2 text-[10px]" style={{ color: t.text3 }}>
                <span>{repo.language}</span>
                {repo.stars > 0 && <span>★ {(repo.stars / 1000).toFixed(1)}k</span>}
                {repo.indexed && <span className="ml-auto" style={{ color: t.accentText }}>● indexed</span>}
              </div>
            </div>
          )
        })}

        {/* + Connect Repository button */}
        <div
          onClick={onConnectClick}
          className="mx-3 mt-2 rounded px-3 py-2 text-xs text-center cursor-pointer transition-all border border-dashed flex items-center justify-center gap-1.5"
          style={{ borderColor: t.border, color: t.text3 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accentText }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text3 }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Connect Repository
        </div>
      </div>
    </div>
  )
}

export const timeAgo = (dateString) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now - date) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export const truncate = (str, length = 50) => {
  if (!str) return ''
  return str.length > length ? str.substring(0, length) + '...' : str
}