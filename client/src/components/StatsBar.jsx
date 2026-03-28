import { useContext } from 'react'
import { ThemeContext } from '../App'
import { getTheme } from '../utils/helpers'

export default function RepoList({ repos, selectedRepo, onSelectRepo, loading }) {
  const { theme } = useContext(ThemeContext)
  const t = getTheme(theme)

  if (loading) return (
    <div className="space-y-1 p-2">
      {[1,2,3].map(i => (
        <div key={i} className="h-12 rounded animate-pulse" style={{ background: t.bg3 }} />
      ))}
    </div>
  )

  return (
    <div>
      {repos.map(repo => {
        const isActive = selectedRepo === repo.name
        return (
          <div
            key={repo.id}
            onClick={() => onSelectRepo(repo.name)}
            className="px-3 py-2.5 cursor-pointer border-l-2 transition-all"
            style={{
              borderLeftColor: isActive ? t.accent : 'transparent',
              background: isActive ? (theme === 'dark' ? '#1a2030' : '#fff8ec') : 'transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.bg3 }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <div className="text-xs font-medium mb-1 truncate"
              style={{ color: isActive ? t.accentText : t.text2 }}>
              {repo.name}
            </div>
            <div className="flex items-center gap-2 text-[10px]" style={{ color: t.text3 }}>
              <span>{repo.language}</span>
              <span>★ {(repo.stars / 1000).toFixed(1)}k</span>
              {repo.indexed && (
                <span className="ml-auto" style={{ color: t.accentText }}>● indexed</span>
              )}
            </div>
          </div>
        )
      })}

      <div
        className="mx-3 mt-2 rounded px-3 py-2 text-xs text-center cursor-pointer transition-all border border-dashed"
        style={{ borderColor: t.border, color: t.text3 }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accentText }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text3 }}
      >
        + Connect Repository
      </div>
    </div>
  )
}