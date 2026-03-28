import { useContext } from 'react'
import { ThemeContext } from '../App'
import { getTheme, getLabelColors, truncate, timeAgo } from '../utils/helpers'

export default function IssueList({ issues, selectedIssue, onSelectIssue, loading }) {
  const { theme } = useContext(ThemeContext)
  const t = getTheme(theme)

  if (loading) return (
    <div className="space-y-2 p-2">
      {[1,2,3].map(i => (
        <div key={i} className="rounded h-16 animate-pulse" style={{ background: t.bg3 }} />
      ))}
    </div>
  )

  return (
    <div className="overflow-y-auto flex-1">
      {issues.map(issue => {
        const isActive = selectedIssue?.id === issue.id
        return (
          <div
            key={issue.id}
            onClick={() => onSelectIssue(issue)}
            className="px-3 py-2.5 cursor-pointer border-l-2 transition-all"
            style={{
              borderLeftColor: isActive ? t.accent : 'transparent',
              background: isActive ? (theme === 'dark' ? '#1a2030' : '#fff8ec') : 'transparent',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = t.bg3 }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <div className="text-[10px] mono mb-1" style={{ color: t.accentText }}>
              #{issue.number}
            </div>
            <div className="text-xs leading-relaxed mb-2" style={{ color: t.text2 }}>
              {truncate(issue.title, 45)}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {issue.labels.map(label => (
                <span key={label}
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${getLabelColors(theme, label)}`}>
                  {label}
                </span>
              ))}
              <span className="text-[9px] ml-auto" style={{ color: t.text3 }}>
                {timeAgo(issue.created_at)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}