import { useState, useEffect } from 'react'
import { getMe, logout as apiLogout } from '../api/client'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser]                       = useState(null)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => {
    // ── Initial auth check ────────────────────────────────────────────────────
    getMe()
      .then(data => {
        if (data?.login) {
          setIsAuthenticated(true)
          setUser(data)
          localStorage.setItem('prguard_user_login', data.login)
        } else {
          setIsAuthenticated(false)
          setUser(null)
          localStorage.removeItem('prguard_user_login')
        }
      })
      .catch((err) => {
        console.error('Auth bootstrap failed:', err)
        setIsAuthenticated(false)
        setUser(null)
        localStorage.removeItem('prguard_user_login')
      })
      .finally(() => {
        setLoading(false)
      })

    // ── React to 401s fired by the axios interceptor ──────────────────────────
    const handleExpiry = () => {
      setIsAuthenticated(false)
      setUser(null)
      setLoading(false)
      localStorage.removeItem('prguard_user_login')
    }
    window.addEventListener('auth:expired', handleExpiry)
    return () => window.removeEventListener('auth:expired', handleExpiry)
  }, [])

  const logout = async () => {
    try {
      await apiLogout()
    } catch (err) {
      console.error('Logout request failed:', err)
    } finally {
      setIsAuthenticated(false)
      setUser(null)
      localStorage.removeItem('prguard_user_login')
      localStorage.removeItem('prguard_installation_id')
      localStorage.removeItem('prguard_pinned')
      localStorage.removeItem('prguard_hidden')
      sessionStorage.clear()
      window.location.href = '/login'
    }
  }

  return { isAuthenticated, user, loading, logout }
}