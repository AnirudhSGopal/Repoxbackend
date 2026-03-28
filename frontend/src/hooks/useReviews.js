import { useState, useEffect } from 'react'
import { getRepos, getIssues, getFiles } from '../api/client'

export const useRepos = () => {
  const [repos, setRepos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRepos().then(data => {
      setRepos(data)
      setLoading(false)
    })
  }, [])

  return { repos, loading }
}

export const useIssues = (repo) => {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!repo) return
    setLoading(true)
    getIssues(repo).then(data => {
      setIssues(data)
      setLoading(false)
    })
  }, [repo])

  return { issues, loading }
}

export const useFiles = (repo) => {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!repo) return
    setLoading(true)
    getFiles(repo).then(data => {
      setFiles(data)
      setLoading(false)
    })
  }, [repo])

  return { files, loading }
}