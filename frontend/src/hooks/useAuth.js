import { useState, useEffect } from 'react'
import { broadcastAuthChanged, getMe, getUserProfile, logout as apiLogout } from '../api/client'

const isSafeRedirect = (candidate, fallback) => {
  if (typeof candidate !== 'string' || !candidate.trim()) return fallback
  try {
    if (candidate.startsWith('/') && !candidate.startsWith('//')) {
      return candidate
    }
    const parsed = new URL(candidate, window.location.origin)
    if (parsed.origin === window.location.origin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    return fallback
  }
  return fallback
}

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser]                       = useState(null)
  const [profile, setProfile]                 = useState(null)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => {
    // ── Initial auth check ────────────────────────────────────────────────────
    getMe()
      .then(async (data) => {
        if (data?.login) {
          setIsAuthenticated(true)
          setUser(data)
          try {
            const profileData = await getUserProfile()
            setProfile(profileData)
          } catch {
            setProfile(null)
          }
          localStorage.setItem('prguard_user_login', data.login)
          broadcastAuthChanged('logged_in')
        } else {
          setIsAuthenticated(false)
          setUser(null)
          setProfile(null)
          localStorage.removeItem('prguard_user_login')
        }
      })
      .catch((err) => {
        console.error('Auth bootstrap failed:', err)
        setIsAuthenticated(false)
        setUser(null)
        setProfile(null)
        localStorage.removeItem('prguard_user_login')
      })
      .finally(() => {
        setLoading(false)
      })

    // ── React to 401s fired by the axios interceptor ──────────────────────────
    const handleExpiry = () => {
      setIsAuthenticated(false)
      setUser(null)
      setProfile(null)
      setLoading(false)
      localStorage.removeItem('prguard_user_login')
      broadcastAuthChanged('expired')
    }
    window.addEventListener('auth:expired', handleExpiry)
    return () => window.removeEventListener('auth:expired', handleExpiry)
  }, [])

  const logout = async () => {
    let redirectTarget = '/login'
    try {
      const payload = await apiLogout()
      redirectTarget = isSafeRedirect(payload?.redirect, '/login')
    } catch (err) {
      console.error('Logout request failed:', err)
    } finally {
      setIsAuthenticated(false)
      setUser(null)
      setProfile(null)
      localStorage.removeItem('prguard_user_login')
      localStorage.removeItem('prguard_installation_id')
      localStorage.removeItem('prguard_pinned')
      localStorage.removeItem('prguard_hidden')
      sessionStorage.clear()
      broadcastAuthChanged('logged_out')
      window.location.href = redirectTarget
    }
  }

  return { isAuthenticated, user, profile, loading, logout }
}