import { useContext, useState, useEffect, useRef } from 'react'
import { ThemeContext } from '../App'
import { getTheme } from '../utils/helpers'

// ── Model options ─────────────────────────────────────────────────────────────
const MODELS = [
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', sub: 'Best for code' },
  { id: 'claude-opus-4-20250514',   label: 'Claude Opus 4',   sub: 'Most powerful'  },
  { id: 'claude-haiku-4',           label: 'Claude Haiku 4',  sub: 'Fastest'        },
  { id: 'gpt-4o',                   label: 'GPT-4o',          sub: 'OpenAI'         },
  { id: 'gemini-1.5-pro',           label: 'Gemini 1.5 Pro',  sub: 'Google · Free'  },
]

const SUGGESTED = [
  'How does the auth module work?',
  'Which files do I need to change?',
  'Explain the folder structure',
  'How do I run the tests?',
]

// ── System prompts ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = (repo, issue, model) =>
  `You are PRGuard AI, a codebase learning assistant.
Repository: ${repo}${issue ? `\nFocused issue: #${issue.number} — "${issue.title}"` : ''}
Model: ${model}
Help developers understand codebases, fix issues, and contribute. Be concise and technical. Use markdown code blocks.`

const VISUALIZE_SYSTEM_PROMPT = (repo, issue) =>
  `You are PRGuard AI. Analyze this GitHub issue and return ONLY a valid JSON object — no markdown, no explanation, no code fences.
Repository: ${repo}
Issue: #${issue.number} — "${issue.title}"

Return exactly this shape:
{
  "type": "issue_analysis",
  "severity": "High|Medium|Low",
  "effort": "~1h|~2h|~4h|~8h",
  "root_cause": "one clear sentence about the root cause",
  "fix_summary": "one clear sentence about how to fix it",
  "files": [
    { "path": "routes/auth.py", "role": "Primary fix", "weight": 0.9 },
    { "path": "services/session.py", "role": "Add method", "weight": 0.6 }
  ],
  "steps": ["step 1 description", "step 2 description", "step 3 description"],
  "related": [
    { "number": 1234, "title": "Related issue title", "note": "why it's related" }
  ],
  "chart": {
    "labels": ["Bug", "Auth", "Security", "Performance"],
    "values": [40, 30, 20, 10]
  }
}`

// ── Content type detector ─────────────────────────────────────────────────────
function detectContentType(content) {
  if (!content) return 'text'
  const trimmed = content.trim()

  if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(trimmed)) return 'image'
  if (/!\[.*?\]\(https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?\)/i.test(trimmed)) return 'image_md'

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed.type === 'issue_analysis') return 'issue_viz'
      if (parsed.type === 'chart' || (parsed.labels && parsed.values)) return 'chart'
      return 'json'
    } catch { /* not JSON */ }
  }

  return 'text'
}

// ── Inline bar chart ──────────────────────────────────────────────────────────
function ChartBubble({ data, t, dark }) {
  const { labels = [], values = [], title = '' } = data
  const max = Math.max(...values, 1)
  const barColors = ['#7F77DD', '#1D9E75', '#D85A30', '#378ADD', '#BA7517', '#D4537E']
  const chartH = 120
  const barW = Math.min(56, Math.floor(460 / Math.max(labels.length, 1)) - 10)

  return (
    <div style={{ background: dark ? '#13161b' : '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 16px', maxWidth: '88%' }}>
      {title && <div style={{ fontSize: 10, fontWeight: 600, color: t.text2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>}
      <svg width="100%" viewBox={`0 0 ${Math.max(labels.length * (barW + 12) + 40, 280)} ${chartH + 46}`} style={{ overflow: 'visible' }}>
        {values.map((v, i) => {
          const barH = Math.max(4, (v / max) * chartH)
          const x = 20 + i * (barW + 12)
          const y = chartH - barH
          const color = barColors[i % barColors.length]
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="4" fill={color} opacity="0.85"/>
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="11" fill={t.text2} fontFamily="monospace">{v}</text>
              <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize="10" fill={t.text3}>
                {(labels[i] || '').length > 8 ? labels[i].slice(0, 7) + '…' : labels[i]}
              </text>
            </g>
          )
        })}
        <line x1="16" y1={chartH} x2={Math.max(labels.length * (barW + 12) + 30, 270)} y2={chartH} stroke={t.border} strokeWidth="0.5"/>
      </svg>
    </div>
  )
}

// ── Issue visualization card ───────────────────────────────────────────────────
function IssueVizBubble({ data, t, dark, onFollowUp }) {
  const severityColor = { High: '#E24B4A', Medium: '#BA7517', Low: '#1D9E75' }[data.severity] || '#888'
  const stepColors = ['#E24B4A', '#BA7517', '#BA7517', '#1D9E75', '#1D9E75']
  const barColors  = ['#7F77DD', '#1D9E75', '#D85A30', '#378ADD', '#D4537E']
  const maxW = Math.max(...(data.files || []).map(f => f.weight || 0), 1)

  return (
    <div style={{ maxWidth: '96%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ background: dark ? '#13161b' : '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: severityColor + '22', color: severityColor, fontWeight: 600, border: `1px solid ${severityColor}44` }}>{data.severity} severity</span>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: dark ? '#1e2535' : '#f0f4ff', color: t.text2, border: `1px solid ${t.border}` }}>Est. {data.effort}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {[{ label: 'Root cause', value: data.root_cause }, { label: 'Fix summary', value: data.fix_summary }].map((m, i) => (
            <div key={i} style={{ background: dark ? '#0d0f12' : '#f8f8f8', borderRadius: 8, padding: '10px 12px', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 9, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 12, color: t.text, lineHeight: 1.5 }}>{m.value}</div>
            </div>
          ))}
        </div>

        {data.files?.length > 0 && (
          <div>
            <div style={{ fontSize: 9, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Files to change</div>
            {data.files.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < data.files.length - 1 ? `1px solid ${t.border}` : 'none' }}>
                <code style={{ fontSize: 10, color: t.accentText, minWidth: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.path}</code>
                <div style={{ flex: 1, height: 5, background: dark ? '#1e2535' : '#e8e8e8', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: barColors[i % barColors.length], width: `${(f.weight / maxW) * 100}%`, transition: 'width 0.6s ease' }}/>
                </div>
                <span style={{ fontSize: 10, color: t.text3, minWidth: 70, textAlign: 'right' }}>{f.role}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {data.steps?.length > 0 && (
          <div style={{ background: dark ? '#13161b' : '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Fix steps</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {data.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: stepColors[i] + '22', border: `1px solid ${stepColors[i]}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: stepColors[i], flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <span style={{ fontSize: 11, color: t.text, lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.chart && (
          <div style={{ background: dark ? '#13161b' : '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Issue breakdown</div>
            <ChartBubble data={data.chart} t={t} dark={dark}/>
          </div>
        )}
      </div>

      {data.related?.length > 0 && (
        <div style={{ background: dark ? '#13161b' : '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: t.text3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Related issues</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.related.map((r, i) => (
              <div key={i} style={{ padding: '8px 10px', background: dark ? '#0d0f12' : '#f8f8f8', borderRadius: 8, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 2 }}>#{r.number} · {r.title}</div>
                <div style={{ fontSize: 11, color: t.text3 }}>{r.note}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        {[
          { label: 'Show code fix', prompt: 'Show me the exact code change needed for the files in the analysis' },
          { label: 'Write the test', prompt: 'Write a test for this fix' },
          { label: 'Scan for more',  prompt: 'Are there other issues related to this in the codebase?' },
        ].map((btn, i) => (
          <button key={i} onClick={() => onFollowUp(btn.prompt)}
            style={{ flex: 1, padding: '7px 10px', fontSize: 11, fontWeight: 500, cursor: 'pointer', borderRadius: 7, background: dark ? '#1e2535' : '#f0f4ff', color: t.accentText, border: `1px solid ${t.border}`, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.accent + '20' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = dark ? '#1e2535' : '#f0f4ff' }}>
            {btn.label} →
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Image bubble ──────────────────────────────────────────────────────────────
function ImageBubble({ content, t, dark }) {
  const urlMatch = content.match(/https?:\/\/[^\s\)]+\.(png|jpg|jpeg|gif|webp|svg)(\?[^\s\)]*)?/i)
  const url = urlMatch ? urlMatch[0] : null
  const altMatch = content.match(/!\[(.*?)\]/)
  const alt = altMatch ? altMatch[1] : 'Image'
  if (!url) return <TextBubble content={content} t={t} dark={dark} isUser={false}/>
  return (
    <div style={{ background: dark ? '#13161b' : '#fff', border: `1px solid ${t.border}`, borderRadius: 12, overflow: 'hidden', maxWidth: '80%' }}>
      <img src={url} alt={alt} style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'contain', background: dark ? '#0a0d11' : '#f5f5f5' }}
        onError={e => { e.target.style.display = 'none' }}/>
      {alt && alt !== 'Image' && (
        <div style={{ padding: '6px 12px', fontSize: 11, color: t.text3, borderTop: `1px solid ${t.border}` }}>{alt}</div>
      )}
    </div>
  )
}

// ── Plain text bubble ─────────────────────────────────────────────────────────
function TextBubble({ content, t, dark, isUser }) {
  return (
    <div style={{ maxWidth: '80%', padding: '9px 13px', borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: isUser ? (dark ? '#1e2535' : '#fef3c7') : (dark ? '#13161b' : '#fff'), border: `1px solid ${isUser ? (dark ? t.accent + '44' : '#d4860a44') : t.border}`, fontSize: 13, lineHeight: 1.65, color: t.text, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {content.split(/(```[\s\S]*?```)/g).map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^[a-z]+\n/, '')
          return <pre key={i} style={{ background: dark ? '#0a0d11' : '#f0f2f5', border: `1px solid ${t.border}`, borderRadius: 6, padding: '8px 10px', fontSize: 11, fontFamily: 'monospace', overflowX: 'auto', margin: '6px 0', color: t.text }}><code>{code}</code></pre>
        }
        return <span key={i}>{part}</span>
      })}
    </div>
  )
}

// ── Unified message bubble ────────────────────────────────────────────────────
function MessageBubble({ msg, t, dark, onFollowUp }) {
  const isUser      = msg.role === 'user'
  const contentType = isUser ? 'text' : detectContentType(msg.content)

  let parsedData = null
  if (['issue_viz', 'chart'].includes(contentType)) {
    try { parsedData = JSON.parse(msg.content.trim()) } catch { /* fallback */ }
  }

  const renderContent = () => {
    if (isUser) return <TextBubble content={msg.content} t={t} dark={dark} isUser={true}/>
    switch (contentType) {
      case 'image':
      case 'image_md':  return <ImageBubble content={msg.content} t={t} dark={dark}/>
      case 'issue_viz': return parsedData ? <IssueVizBubble data={parsedData} t={t} dark={dark} onFollowUp={onFollowUp}/> : <TextBubble content={msg.content} t={t} dark={dark} isUser={false}/>
      case 'chart':     return parsedData ? <ChartBubble data={parsedData} t={t} dark={dark}/> : <TextBubble content={msg.content} t={t} dark={dark} isUser={false}/>
      default:          return <TextBubble content={msg.content} t={t} dark={dark} isUser={false}/>
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: 8, padding: '6px 16px' }}>
      {!isUser && (
        <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: t.accent + '22', border: `1px solid ${t.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
          <span style={{ fontSize: 9, color: t.accentText, fontWeight: 700 }}>PG</span>
        </div>
      )}
      {renderContent()}
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ t }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', background: t.accent + '22', border: `1px solid ${t.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: t.accentText, fontWeight: 700 }}>PG</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: t.accent, animation: 'pgBounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }}/>
        ))}
      </div>
      <style>{`@keyframes pgBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}`}</style>
    </div>
  )
}

// ── File chip ─────────────────────────────────────────────────────────────────
function FileChip({ file, onRemove, t, dark }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 6, background: dark ? '#1e2535' : '#f0f4ff', border: `1px solid ${t.border}`, fontSize: 11, color: t.text2, maxWidth: 180 }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.accentText} strokeWidth="2.5" strokeLinecap="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13 2 13 9 20 9"/>
      </svg>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
      <button onClick={() => onRemove(file.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.text3, padding: 0, lineHeight: 1, fontSize: 13 }}>×</button>
    </div>
  )
}

// ── No API Key Modal ──────────────────────────────────────────────────────────
function NoApiKeyModal({ t, dark, onClose }) {
  const mutedText = dark ? '#6b7280' : '#888'
  const panelBg   = dark ? '#0f1318' : '#ffffff'
  const panelBord = dark ? '#1e2a3a' : '#e2e2e2'
  const openApiPanel = () => { window.dispatchEvent(new CustomEvent('prguard:openApiPanel')); onClose() }
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[99999]"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 400, background: panelBg, border: `1px solid ${panelBord}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${dark ? '#161e28' : '#f0f0f0'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#f59e0b22', border: '1px solid #f59e0b55', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>
                </svg>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>API Key Required</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedText, fontSize: 18, lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = t.text} onMouseLeave={e => e.currentTarget.style.color = mutedText}>×</button>
          </div>
          <p style={{ fontSize: 11, color: mutedText, marginTop: 6, lineHeight: 1.6 }}>Connect an LLM provider to start chatting with your codebase.</p>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', gap: 10, padding: '12px 14px', borderRadius: 10, background: '#f59e0b0d', border: '1px solid #f59e0b33', marginBottom: 18 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', marginBottom: 2 }}>No API key detected</p>
              <p style={{ fontSize: 11, color: mutedText, lineHeight: 1.6 }}>PRGuard calls the LLM API directly from your browser. Your key is stored locally and never sent to our servers.</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {[{ label: 'Claude Sonnet', color: '#d97706', recommended: true }, { label: 'GPT-4o', color: '#10b981', recommended: false }, { label: 'Gemini 1.5', color: '#3b82f6', recommended: false }].map(p => (
              <div key={p.label} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: dark ? '#0a0e13' : '#f8f8f8', border: `1px solid ${dark ? '#1e2a3a' : '#e8e8e8'}`, textAlign: 'center' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, margin: '0 auto 5px' }}/>
                <div style={{ fontSize: 10, fontWeight: 500, color: t.text2 }}>{p.label}</div>
                {p.recommended && <div style={{ fontSize: 9, color: t.accentText, marginTop: 2 }}>recommended</div>}
              </div>
            ))}
          </div>
          <button onClick={openApiPanel}
            style={{ width: '100%', padding: '11px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: t.accentBg, color: t.accentFg, border: `1px solid ${t.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, transition: 'opacity 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/>
            </svg>
            Connect API Key
          </button>
          <p style={{ textAlign: 'center', fontSize: 10, color: mutedText, marginTop: 10 }}>🔒 Stored locally · Never sent to PRGuard servers</p>
        </div>
      </div>
    </div>
  )
}

// ── Connect Repository Modal ──────────────────────────────────────────────────
function ConnectRepoModal({ t, dark, onClose, onConnect }) {
  const [value, setValue]       = useState('')
  const [stage, setStage]       = useState('input')
  const [progress, setProgress] = useState(0)
  const [repoInfo, setRepoInfo] = useState(null)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const parseRepo = (raw) => {
    const s = raw.trim().replace('https://github.com/', '').replace(/\/$/, '')
    const parts = s.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null
  }

  const handleConnect = () => {
    const name = parseRepo(value)
    if (!name) return
    setRepoInfo(name); setStage('indexing'); setProgress(0)
    const steps = [8, 22, 35, 51, 64, 78, 89, 97, 100]; let i = 0
    const tick = setInterval(() => {
      setProgress(steps[i]); i++
      if (i >= steps.length) { clearInterval(tick); setTimeout(() => setStage('done'), 400) }
    }, 320)
  }

  const mutedText = dark ? '#6b7280' : '#888'
  const inputBg   = dark ? '#0a0e13' : '#f5f5f5'
  const panelBg   = dark ? '#0f1318' : '#ffffff'
  const panelBord = dark ? '#1e2a3a' : '#e2e2e2'

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[99999]"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width: 420, background: panelBg, border: `1px solid ${panelBord}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${dark ? '#161e28' : '#f0f0f0'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={t.accentText} strokeWidth="2.5" strokeLinecap="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.text }}>Connect Repository</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedText, fontSize: 18, lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = t.text} onMouseLeave={e => e.currentTarget.style.color = mutedText}>×</button>
          </div>
          <p style={{ fontSize: 11, color: mutedText, marginTop: 4 }}>Paste a GitHub URL or type <code style={{ fontFamily: 'monospace', color: t.accentText }}>owner/repo</code></p>
        </div>
        <div style={{ padding: '20px' }}>
          {stage === 'input' && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, background: inputBg, border: `1px solid ${panelBord}` }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={mutedText} strokeWidth="2" strokeLinecap="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                  </svg>
                  <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && value.trim()) handleConnect() }}
                    placeholder="https://github.com/owner/repo"
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, fontFamily: 'monospace', color: t.text }}/>
                  {value && <button onClick={() => setValue('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedText, fontSize: 14, lineHeight: 1 }}>×</button>}
                </div>
                <button onClick={handleConnect} disabled={!value.trim()}
                  style={{ padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: value.trim() ? 'pointer' : 'not-allowed', background: value.trim() ? t.accentBg : (dark ? '#1e2535' : '#e8e8e8'), color: value.trim() ? t.accentFg : mutedText, border: `1px solid ${value.trim() ? t.accent : panelBord}`, transition: 'all 0.15s' }}>
                  Index
                </button>
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 10, color: mutedText, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick add</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['tiangolo/fastapi', 'pallets/flask', 'django/django', 'expressjs/express'].map(r => (
                    <button key={r} onClick={() => setValue(r)}
                      style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', cursor: 'pointer', background: dark ? '#1e2535' : '#f0f4ff', color: t.accentText, border: `1px solid ${t.border}`, transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.accent + '20' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = dark ? '#1e2535' : '#f0f4ff' }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: dark ? '#0a0e13' : '#f8f8f8', border: `1px solid ${panelBord}`, fontSize: 11, color: mutedText, lineHeight: 1.6 }}>
                <strong style={{ color: t.text2 }}>What happens when you index?</strong><br/>
                PRGuard reads the file structure and metadata. In the full version, it embeds code into a vector DB for RAG search.
              </div>
            </>
          )}
          {stage === 'indexing' && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: dark ? '#1e2535' : '#f0f4ff', border: `1px solid ${t.border}`, fontSize: 12, fontFamily: 'monospace', color: t.accentText, marginBottom: 20 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
                {repoInfo}
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ height: 4, borderRadius: 4, background: dark ? '#1e2535' : '#e8e8e8', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, background: t.accent, width: `${progress}%`, transition: 'width 0.3s ease' }}/>
                </div>
              </div>
              <p style={{ fontSize: 12, color: mutedText, marginBottom: 4 }}>
                {progress < 30 ? '📂 Reading file structure...' : progress < 60 ? '🔍 Parsing source files...' : progress < 90 ? '🧠 Building embeddings...' : '✅ Finalising index...'}
              </p>
              <p style={{ fontSize: 10, color: mutedText }}>{progress}% complete</p>
            </div>
          )}
          {stage === 'done' && (
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#22c55e22', border: '2px solid #22c55e55', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 4 }}>Repository indexed!</p>
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: t.accentText, marginBottom: 16 }}>{repoInfo}</p>
              <p style={{ fontSize: 11, color: mutedText, marginBottom: 20 }}>Ready to answer questions about this codebase.</p>
              <button onClick={() => { onConnect({ id: Date.now(), name: repoInfo, language: 'Unknown', stars: 0, indexed: true }); onClose() }}
                style={{ width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: t.accentBg, color: t.accentFg, border: `1px solid ${t.accent}` }}>
                Add to sidebar →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ChatPanel ────────────────────────────────────────────────────────────
export default function ChatPanel({ selectedRepo, selectedIssue, chatInput, setChatInput, autoSend, setAutoSend, onRepoConnect }) {
  const { theme } = useContext(ThemeContext)
  const t    = getTheme(theme)
  const dark = theme === 'dark'

  const [messages,      setMessages]      = useState([])
  const [loading,       setLoading]       = useState(false)
  const [apiKey,        setApiKey]        = useState(null)
  const [noKey,         setNoKey]         = useState(false)
  const [noKeyModal,    setNoKeyModal]    = useState(false)
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [connectOpen,   setConnectOpen]   = useState(false)
  const [plusMenuOpen,  setPlusMenuOpen]  = useState(false)
  const [vizMode,       setVizMode]       = useState(false)

  const bottomRef    = useRef(null)
  const textareaRef  = useRef(null)
  const fileInputRef = useRef(null)
  const modelBtnRef  = useRef(null)
  const plusBtnRef   = useRef(null)

  // ── Read API key — show modal immediately on mount if missing ──────────────
  useEffect(() => {
    const read = (showModal = false) => {
      const k = localStorage.getItem('prguard_apikey')
      const hasKey = k && k.trim() !== ''
      setApiKey(hasKey ? k : null)
      setNoKey(!hasKey)
      // Only auto-pop on mount (showModal=true), not on every interval tick
      if (!hasKey && showModal) setNoKeyModal(true)
    }
    read(true) // show modal on first mount if no key
    const onStorage = () => read(false)
    window.addEventListener('storage', onStorage)
    const timer = setInterval(() => read(false), 500)
    return () => { window.removeEventListener('storage', onStorage); clearInterval(timer) }
  }, [])

  useEffect(() => { setMessages([]); setAttachedFiles([]) }, [selectedRepo])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    if (autoSend && chatInput?.trim()) {
      const timer = setTimeout(() => {
        if (selectedIssue) sendVisualization()
        else sendMessage(chatInput)
        setAutoSend(false)
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [autoSend, chatInput])

  useEffect(() => {
    if (chatInput && !autoSend) textareaRef.current?.focus()
  }, [chatInput])

  useEffect(() => {
    const handler = (e) => {
      if (modelBtnRef.current && !modelBtnRef.current.contains(e.target)) setModelMenuOpen(false)
      if (plusBtnRef.current  && !plusBtnRef.current.contains(e.target))  setPlusMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const apiHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey || '',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  }

  const sendVisualization = async () => {
    if (!selectedIssue || loading) return
    if (!apiKey) { setNoKeyModal(true); return }

    const userMsg = { role: 'user', content: `⬡ Visualize Issue #${selectedIssue.number}: "${selectedIssue.title}"` }
    setMessages(prev => [...prev, userMsg])
    setChatInput('')
    setLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          system: VISUALIZE_SYSTEM_PROMPT(selectedRepo, selectedIssue),
          messages: [{ role: 'user', content: `Analyze issue #${selectedIssue.number}: "${selectedIssue.title}"` }],
        }),
      })
      const data = await res.json()

      // Auth error or bad key → remove user msg, show modal
      if (!res.ok || data.error || !data.content) {
        setMessages(prev => prev.slice(0, -1))
        setNoKeyModal(true)
        return
      }

      const reply = data.content.map(b => b.text || '').join('') || '{}'
      try {
        const parsed = JSON.parse(reply.trim())
        parsed.type === 'issue_analysis'
          ? setMessages(prev => [...prev, { role: 'assistant', content: reply.trim() }])
          : setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      }
    } catch {
      setMessages(prev => prev.slice(0, -1))
      setNoKeyModal(true)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (text) => {
    const content = (text ?? chatInput ?? '').trim()
    if (!content || loading) return
    if (!apiKey) { setNoKeyModal(true); return }

    setChatInput('')
    const userMsg     = { role: 'user', content: attachedFiles.length > 0 ? `${content}\n\n[Attached: ${attachedFiles.map(f => f.name).join(', ')}]` : content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setAttachedFiles([])
    setLoading(true)

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          model: selectedModel.id.startsWith('claude') ? selectedModel.id : 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT(selectedRepo, selectedIssue, selectedModel.label),
          messages: newMessages,
        }),
      })
      const data  = await res.json()

      // Auth error or bad key → undo user msg, show modal
      if (!res.ok || data.error || !data.content) {
        setMessages(prev => prev.slice(0, -1))
        setNoKeyModal(true)
        return
      }

      const reply = data.content.map(b => b.text || '').join('') || 'No response generated.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => prev.slice(0, -1))
      setNoKeyModal(true)
    } finally {
      setLoading(false)
    }
  }

  const handleFollowUp = (prompt) => { sendMessage(prompt) }

  const handleFileAttach = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachedFiles(prev => [...prev, ...files.map(f => ({ name: f.name, size: f.size }))])
    e.target.value = ''
    setPlusMenuOpen(false)
  }

  const isEmpty   = messages.length === 0
  const mutedText = dark ? '#6b7280' : '#888'
  const inputBg   = dark ? '#13161b' : '#ffffff'
  const barBg     = dark ? '#0d0f12' : '#f0f2f5'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.bg, overflow: 'hidden', position: 'relative' }}>

      {/* Header */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }}/>
        <span style={{ fontSize: 12, color: t.text2 }}>
          {selectedIssue ? `Issue #${selectedIssue.number} · ${selectedRepo}` : `Chatting about ${selectedRepo}`}
        </span>

        {selectedIssue && (
          <div style={{ marginLeft: 'auto', display: 'flex', background: dark ? '#1e2535' : '#f0f0f0', borderRadius: 7, padding: 2, gap: 1 }}>
            {[{ id: false, label: 'Chat' }, { id: true, label: '⬡ Visualize' }].map(opt => (
              <button key={String(opt.id)} onClick={() => setVizMode(opt.id)}
                style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s', background: vizMode === opt.id ? (dark ? t.accent : '#fff') : 'transparent', color: vizMode === opt.id ? (dark ? t.accentFg : t.accentText) : t.text3, boxShadow: vizMode === opt.id ? '0 1px 3px rgba(0,0,0,0.15)' : 'none' }}>
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {chatInput && !autoSend && !selectedIssue && (
          <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 4, background: t.accent + '18', color: t.accentText, border: `1px solid ${t.accent}44` }}>
            ✦ pre-filled — edit or press Enter
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {isEmpty && (
          <div style={{ padding: '16px 16px 8px' }}>
            <div style={{ background: dark ? '#13161b' : '#fff', border: `1px solid ${t.border}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.accentText, marginBottom: 8 }}>PRGUARD AI</div>
              <p style={{ fontSize: 13, color: t.text, lineHeight: 1.65, margin: 0 }}>
                Hello! I have indexed this repository and I am ready to help. Ask me anything — or click an <strong>issue</strong> or <strong>file</strong> on the left to instantly ask about it.
                {selectedIssue && <><br/><br/>Click <strong>⬡ Visualize</strong> above to get an AI-powered analysis with charts, file breakdown, and fix steps.</>}
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} t={t} dark={dark} onFollowUp={handleFollowUp}/>
        ))}
        {loading && <TypingIndicator t={t}/>}

        {noKey && !loading && messages.length === 0 && (
          <div style={{ padding: '6px 16px' }}>
            <div style={{ fontSize: 11, color: '#f59e0b', background: '#f59e0b11', border: '1px solid #f59e0b33', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
              onClick={() => setNoKeyModal(true)}>
              ⚠ No API key — <strong style={{ textDecoration: 'underline' }}>click here to connect one</strong>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Suggestion chips */}
      {isEmpty && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '0 16px 10px', flexShrink: 0 }}>
          {selectedIssue && (
            <button onClick={sendVisualization}
              style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '9px 12px', fontSize: 12, fontWeight: 600, color: t.accentFg, background: t.accentBg, border: `1px solid ${t.accent}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}>
              ⬡ Visualize Issue #{selectedIssue.number} with AI
            </button>
          )}
          {SUGGESTED.map((s, i) => (
            <button key={i} onClick={() => { if (!apiKey) { setNoKeyModal(true); return } sendMessage(s) }}
              style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: t.text3, background: dark ? '#13161b' : '#fff', border: `1px solid ${t.border}`, borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accentText }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text3 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: '10px 14px 12px', borderTop: `1px solid ${t.border}`, background: barBg, flexShrink: 0 }}>

        {attachedFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {attachedFiles.map(f => (
              <FileChip key={f.name} file={f} t={t} dark={dark}
                onRemove={name => setAttachedFiles(prev => prev.filter(x => x.name !== name))}/>
            ))}
          </div>
        )}

        {vizMode && selectedIssue ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={sendVisualization} disabled={loading}
              style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? (dark ? '#1e2535' : '#e8e8e8') : t.accentBg, color: loading ? mutedText : t.accentFg, border: `1px solid ${loading ? t.border : t.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              {loading ? 'Analyzing...' : `Analyze Issue #${selectedIssue.number}`}
            </button>
            <button onClick={() => setVizMode(false)}
              style={{ padding: '10px 14px', borderRadius: 10, fontSize: 12, cursor: 'pointer', background: 'transparent', color: t.text3, border: `1px solid ${t.border}` }}>
              Chat instead
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, background: inputBg, border: `1px solid ${chatInput ? t.accent : t.border}`, borderRadius: 12, padding: '8px 8px 8px 6px', transition: 'border-color 0.15s' }}>

            <div style={{ position: 'relative', flexShrink: 0 }} ref={plusBtnRef}>
              <button onClick={() => setPlusMenuOpen(p => !p)} title="Attach or connect"
                style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: plusMenuOpen ? (dark ? '#1e2535' : '#e8e8e8') : 'transparent', border: `1px solid ${plusMenuOpen ? t.border : 'transparent'}`, color: t.text3, transition: 'all 0.15s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = dark ? '#1e2535' : '#e8e8e8'; e.currentTarget.style.color = t.text }}
                onMouseLeave={e => { if (!plusMenuOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = t.text3 } }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              {plusMenuOpen && (
                <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, background: dark ? '#0f1318' : '#fff', border: `1px solid ${dark ? '#1e2a3a' : '#e2e2e2'}`, borderRadius: 10, overflow: 'hidden', width: 210, boxShadow: dark ? '0 -8px 24px rgba(0,0,0,0.6)' : '0 -4px 16px rgba(0,0,0,0.1)', zIndex: 100 }}>
                  {[
                    { icon: '📎', label: 'Attach file',        desc: 'Upload a file to discuss', action: () => fileInputRef.current?.click() },
                    { icon: '📁', label: 'Connect Repository', desc: 'Index a GitHub repo',       action: () => { setConnectOpen(true); setPlusMenuOpen(false) } },
                    { icon: '⬡',  label: 'Visualize issue',    desc: 'AI chart + analysis',      action: () => { setVizMode(true); setPlusMenuOpen(false) } },
                  ].map((item, i) => (
                    <button key={i} onClick={item.action}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 10, background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: i < 2 ? `1px solid ${dark ? '#161e28' : '#f0f0f0'}` : 'none', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = dark ? '#1e2535' : '#f5f5f5'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: t.text }}>{item.label}</div>
                        <div style={{ fontSize: 10, color: mutedText, marginTop: 1 }}>{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea ref={textareaRef} value={chatInput ?? ''}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Ask anything about this codebase... or click an issue / file →"
              rows={1}
              style={{ flex: 1, resize: 'none', outline: 'none', background: 'transparent', border: 'none', padding: '4px 4px', fontSize: 13, fontFamily: 'inherit', color: t.text, lineHeight: 1.55, maxHeight: 120, overflowY: 'auto' }}/>

            <div style={{ position: 'relative', flexShrink: 0 }} ref={modelBtnRef}>
              <button onClick={() => setModelMenuOpen(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 7, background: modelMenuOpen ? (dark ? '#1e2535' : '#e8e8e8') : (dark ? '#1a2030' : '#f0f0f0'), border: `1px solid ${dark ? '#2a3a50' : '#d8d8d8'}`, cursor: 'pointer', fontSize: 11, fontWeight: 500, color: t.text2, transition: 'all 0.15s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = dark ? '#1e2535' : '#e4e4e4'}
                onMouseLeave={e => e.currentTarget.style.background = modelMenuOpen ? (dark ? '#1e2535' : '#e8e8e8') : (dark ? '#1a2030' : '#f0f0f0')}>
                <span>{selectedModel.label}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: 0.5 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {modelMenuOpen && (
                <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 6, background: dark ? '#0f1318' : '#fff', border: `1px solid ${dark ? '#1e2a3a' : '#e2e2e2'}`, borderRadius: 10, overflow: 'hidden', width: 220, boxShadow: dark ? '0 -8px 24px rgba(0,0,0,0.6)' : '0 -4px 16px rgba(0,0,0,0.1)', zIndex: 100 }}>
                  <div style={{ padding: '8px 12px 6px', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', color: mutedText, borderBottom: `1px solid ${dark ? '#161e28' : '#f0f0f0'}` }}>Select model</div>
                  {MODELS.map(model => (
                    <button key={model.id} onClick={() => { setSelectedModel(model); setModelMenuOpen(false) }}
                      style={{ width: '100%', textAlign: 'left', padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selectedModel.id === model.id ? (dark ? '#1e2535' : '#f5f5f5') : 'transparent', border: 'none', borderBottom: `1px solid ${dark ? '#161e28' : '#f5f5f5'}`, cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseEnter={e => { if (selectedModel.id !== model.id) e.currentTarget.style.background = dark ? '#1a2030' : '#f8f8f8' }}
                      onMouseLeave={e => { if (selectedModel.id !== model.id) e.currentTarget.style.background = 'transparent' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: selectedModel.id === model.id ? 600 : 400, color: selectedModel.id === model.id ? t.accentText : t.text }}>{model.label}</div>
                        <div style={{ fontSize: 10, color: mutedText, marginTop: 1 }}>{model.sub}</div>
                      </div>
                      {selectedModel.id === model.id && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={t.accentText} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => sendMessage()} disabled={!(chatInput ?? '').trim() || loading}
              style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (chatInput ?? '').trim() && !loading ? 'pointer' : 'not-allowed', background: (chatInput ?? '').trim() && !loading ? t.accent : (dark ? '#1e2535' : '#e8eaf0'), border: `1px solid ${(chatInput ?? '').trim() && !loading ? t.accent : t.border}`, transition: 'all 0.15s', color: (chatInput ?? '').trim() && !loading ? t.accentFg : t.text3 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        )}

        <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={handleFileAttach}/>
        <p style={{ fontSize: 10, color: dark ? '#2a3a50' : '#ccc', textAlign: 'center', marginTop: 6 }}>
          Enter to send · Shift+Enter for new line · Click + to attach or connect a repo
        </p>
      </div>

      {noKeyModal && <NoApiKeyModal t={t} dark={dark} onClose={() => setNoKeyModal(false)}/>}
      {connectOpen && <ConnectRepoModal t={t} dark={dark} onClose={() => setConnectOpen(false)} onConnect={(repo) => onRepoConnect?.(repo)}/>}
    </div>
  )
}