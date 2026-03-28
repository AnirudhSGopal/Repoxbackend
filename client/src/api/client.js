import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

export const getRepos = async () => {
  try {
    const res = await client.get('/api/repos')
    return res.data
  } catch {
    return MOCK_REPOS
  }
}

export const getIssues = async (repo) => {
  try {
    const res = await client.get(`/api/issues?repo=${repo}`)
    return res.data
  } catch {
    return MOCK_ISSUES
  }
}

export const getFiles = async (repo) => {
  try {
    const res = await client.get(`/api/files?repo=${repo}`)
    return res.data
  } catch {
    return MOCK_FILES
  }
}

export const sendMessage = async (message, repo, issueId) => {
  try {
    const res = await client.post('/api/chat', { message, repo, issue_id: issueId })
    return res.data
  } catch {
    return {
      answer: generateMockAnswer(message),
      sources: MOCK_SOURCES,
      issue_context: issueId ? MOCK_ISSUES.find(i => i.id === issueId) : null,
    }
  }
}

const generateMockAnswer = (message) => {
  if (message.toLowerCase().includes('auth'))
    return 'The authentication module is in `auth/session.py`. It uses JWT tokens with a 1-hour expiry. The main entry point is `create_session()` which validates credentials and returns a signed token. This connects to the middleware in `middleware/jwt.py` which validates tokens on every protected route.'
  if (message.toLowerCase().includes('issue'))
    return 'Looking at the GitHub issue and the codebase context — the bug is in `routes/auth.py` line 67. The session is not being invalidated on logout because `delete_session()` is never called. You need to add a call to `session.delete_session(user_id)` inside the logout route handler.'
  return 'Based on the codebase context retrieved via RAG, here is what I found. The relevant code is in the `src/` directory. The main entry point connects to several modules that handle this functionality. Let me walk you through the architecture step by step so you can understand where to make your contribution.'
}

export const MOCK_REPOS = [
  { id: 1, name: 'fastapi/fastapi', stars: 72400, language: 'Python', indexed: true },
  { id: 2, name: 'tiangolo/sqlmodel', stars: 13200, language: 'Python', indexed: true },
  { id: 3, name: 'pallets/flask', stars: 66800, language: 'Python', indexed: false },
]

export const MOCK_ISSUES = [
  { id: 101, number: 4521, title: 'Logout does not invalidate session token', labels: ['bug'], comments: 8, created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 102, number: 4498, title: 'Add rate limiting to auth endpoints', labels: ['feature'], comments: 3, created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 103, number: 4467, title: 'Improve error messages for validation', labels: ['good first issue'], comments: 2, created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 104, number: 4445, title: 'Document the dependency injection system', labels: ['documentation'], comments: 5, created_at: new Date(Date.now() - 345600000).toISOString() },
  { id: 105, number: 4401, title: 'WebSocket connections drop after timeout', labels: ['bug'], comments: 12, created_at: new Date(Date.now() - 432000000).toISOString() },
]

export const MOCK_FILES = [
  { path: 'fastapi/', type: 'folder', children: [
    { path: 'fastapi/main.py', type: 'file', language: 'python' },
    { path: 'fastapi/routing.py', type: 'file', language: 'python' },
    { path: 'fastapi/security.py', type: 'file', language: 'python' },
    { path: 'fastapi/middleware/', type: 'folder', children: [
      { path: 'fastapi/middleware/cors.py', type: 'file', language: 'python' },
      { path: 'fastapi/middleware/httpsredirect.py', type: 'file', language: 'python' },
    ]},
  ]},
  { path: 'tests/', type: 'folder', children: [
    { path: 'tests/test_routing.py', type: 'file', language: 'python' },
    { path: 'tests/test_security.py', type: 'file', language: 'python' },
  ]},
  { path: 'docs/', type: 'folder', children: [
    { path: 'docs/tutorial.md', type: 'file', language: 'markdown' },
  ]},
]

export const MOCK_SOURCES = [
  { file: 'fastapi/security.py', lines: '34-67', relevance: 0.94 },
  { file: 'fastapi/middleware/httpsredirect.py', lines: '12-28', relevance: 0.81 },
]

export default client