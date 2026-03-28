import { useState, useEffect } from 'react'

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('prguard_token')
    if (token) {
      setIsAuthenticated(true)
      setUser(JSON.parse(localStorage.getItem('prguard_user') || '{}'))
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('prguard_token')
    localStorage.removeItem('prguard_user')
    setIsAuthenticated(false)
    setUser(null)
  }

  return { isAuthenticated, user, logout }
}