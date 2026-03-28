import { useState, useContext } from 'react'
import { ThemeContext } from '../App'
import { getTheme } from '../utils/helpers'
import Navbar from '../components/Navbar'
import RepoList from '../components/StatsBar'
import IssueList from '../components/ActivityFeed'
import FileTree from '../components/ReviewCard'
import ChatPanel from '../components/InstallButton'
import { useRepos, useIssues, useFiles } from '../hooks/useReviews'

export default function Dashboard() {
  const { theme } = useContext(ThemeContext)
  const t = getTheme(theme)
  const [selectedRepo, setSelectedRepo] = useState('fastapi/fastapi')
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [leftTab, setLeftTab] = useState('issues')

  const { repos, loading: reposLoading } = useRepos()
  const { issues, loading: issuesLoading } = useIssues(selectedRepo)
  const { files, loading: filesLoading } = useFiles(selectedRepo)

  return (
    <div className="h-screen flex flex-col overflow-hidden"
      style={{ background: t.bg, color: t.text }}>
      <Navbar />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="w-52 flex flex-col flex-shrink-0 min-h-0"
          style={{ background: t.bg2, borderRight: `1px solid ${t.border}` }}>
          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${t.border}` }}>
            <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: t.text3 }}>
              Repositories
            </p>
          </div>
          <div className="overflow-y-auto flex-1 py-1">
            <RepoList
              repos={repos}
              selectedRepo={selectedRepo}
              onSelectRepo={(r) => { setSelectedRepo(r); setSelectedIssue(null) }}
              loading={reposLoading}
            />
          </div>
        </div>

        <div className="w-52 flex flex-col flex-shrink-0 min-h-0"
          style={{ background: t.bg2, borderRight: `1px solid ${t.border}` }}>
          <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${t.border}` }}>
            {['issues', 'files'].map(tab => (
              <button key={tab} onClick={() => setLeftTab(tab)}
                className="flex-1 py-2 text-[10px] uppercase tracking-widest border-b-2 transition-all capitalize"
                style={{
                  borderBottomColor: leftTab === tab ? t.accent : 'transparent',
                  color: leftTab === tab ? t.accentText : t.text3,
                }}>
                {tab}
              </button>
            ))}
          </div>

          {leftTab === 'issues' ? (
            <IssueList
              issues={issues}
              selectedIssue={selectedIssue}
              onSelectIssue={setSelectedIssue}
              loading={issuesLoading}
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <FileTree files={files} />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
          <ChatPanel selectedRepo={selectedRepo} selectedIssue={selectedIssue} />
        </div>
      </div>

      <div className="h-6 flex items-center px-4 gap-6 flex-shrink-0"
        style={{ background: t.bg2, borderTop: `1px solid ${t.border}` }}>
        <span className="text-[10px] mono" style={{ color: t.accentText }}>PRGuard</span>
        <span className="text-[10px]" style={{ color: t.text3 }}>● RAG Active</span>
        <span className="text-[10px]" style={{ color: t.text3 }}>{selectedRepo}</span>
        {selectedIssue && (
          <span className="text-[10px]" style={{ color: t.text3 }}>Issue #{selectedIssue.number}</span>
        )}
        <span className="text-[10px] ml-auto" style={{ color: t.text3 }}>Claude Sonnet · ChromaDB</span>
      </div>
    </div>
  )
}