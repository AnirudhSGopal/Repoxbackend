import { useState, useContext, useRef, useEffect } from 'react'
import { ThemeContext } from '../App'
import { getTheme } from '../utils/helpers'
import { sendMessage } from '../api/client'

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

export default function ChatPanel({ selectedRepo, selectedIssue }) {
  const { theme } = useContext(ThemeContext)
  const t = getTheme(theme)
  const [messages, setMessages] = useState([{
    role: 'ai',
    content: 'Hello! I have indexed this repository and I am ready to help you understand the codebase. Ask me anything — how modules connect, what a file does, or how to fix an open issue.',
    sources: [],
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (selectedIssue) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `You selected Issue #${selectedIssue.number}: "${selectedIssue.title}". I will focus my answers on this issue. Ask me what code is responsible, how to fix it, or where to start contributing.`,
        sources: [],
      }])
    }
  }, [selectedIssue])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    setLoading(true)
    const response = await sendMessage(input, selectedRepo, selectedIssue?.id)
    setMessages(prev => [...prev, {
      role: 'ai',
      content: response.answer,
      sources: response.sources || [],
    }])
    setLoading(false)
  }

  const suggestions = [
    'How does the auth module work?',
    'Which files do I need to change?',
    'Explain the folder structure',
    'How do I run the tests?',
  ]

  return (
    <div className="flex flex-col h-full" style={{ background: t.bg }}>
      <div className="px-4 py-2 flex items-center justify-between flex-shrink-0"
        style={{ background: t.bg2, borderBottom: `1px solid ${t.border}` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs" style={{ color: t.text2 }}>
            {selectedRepo ? `Chatting about ${selectedRepo}` : 'Select a repository to start'}
          </span>
        </div>
        {selectedIssue && (
          <span className="text-xs mono px-2 py-0.5 rounded"
            style={{ color: t.accentText, background: t.bg3, border: `1px solid ${t.border}` }}>
            Issue #{selectedIssue.number}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="text-[9px] uppercase tracking-widest"
                style={{ color: msg.role === 'user' ? t.blue : t.accentText }}>
                {msg.role === 'user' ? 'You' : 'PRGuard AI'}
              </span>
              <div className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                style={{
                  background: msg.role === 'user'
                    ? (theme === 'dark' ? '#1a2030' : '#e8f0fe')
                    : t.bg3,
                  border: `1px solid ${msg.role === 'user'
                    ? (theme === 'dark' ? '#2a3a5a' : '#c0d0f0')
                    : t.border}`,
                  color: t.text,
                }}>
                {msg.content}
              </div>

              {msg.sources?.length > 0 && (
                <div className="w-full rounded-lg p-2.5 space-y-1.5"
                  style={{ background: t.bg2, border: `1px solid ${t.border}` }}>
                  <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: t.text3 }}>
                    RAG Sources
                  </p>
                  {msg.sources.map((src, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <span className="text-[10px] mono" style={{ color: t.accentText }}>{src.file}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px]" style={{ color: t.text3 }}>lines {src.lines}</span>
                        <span className="text-[10px]" style={{ color: t.green }}>
                          {Math.round(src.relevance * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-3 flex items-center gap-2"
              style={{ background: t.bg3, border: `1px solid ${t.border}` }}>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: t.accent, animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <span className="text-xs" style={{ color: t.text3 }}>Searching codebase...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => setInput(s)}
              className="text-left text-xs px-3 py-2 rounded transition-all"
              style={{ background: t.bg2, border: `1px solid ${t.border}`, color: t.text3 }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accentText }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.text3 }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 flex gap-2 flex-shrink-0"
        style={{ background: t.bg2, borderTop: `1px solid ${t.border}` }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }}}
          placeholder={selectedRepo ? 'Ask anything about this codebase...' : 'Select a repo first...'}
          disabled={!selectedRepo}
          className="flex-1 rounded-lg px-3 py-2 text-xs outline-none mono disabled:opacity-40"
          style={{
            background: t.bg3,
            border: `1px solid ${t.border}`,
            color: t.text,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!selectedRepo || !input.trim() || loading}
          className="flex items-center justify-center w-9 h-9 rounded-lg transition-all disabled:opacity-30"
          style={{ background: t.accentBg, color: t.accentFg }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}