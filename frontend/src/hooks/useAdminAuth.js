import { useEffect, useState } from 'react'
import { adminLogout, getAdminMe } from '../api/client'

export const useAdminAuth = () => {
  const [loading, setLoading] = useState(true)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminUser, setAdminUser] = useState(null)

  const refresh = async () => {
    try {
      const data = await getAdminMe()
      if (data?.role === 'admin') {
        setAdminUser(data)
        setIsAdminAuthenticated(true)
      } else {
        setAdminUser(null)
        setIsAdminAuthenticated(false)
      }
    } catch {
      setAdminUser(null)
      setIsAdminAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const logout = async () => {
    try {
      await adminLogout()
    } catch {
      // ignore network failures on logout
    } finally {
      setAdminUser(null)
      setIsAdminAuthenticated(false)
      window.location.href = '/admin/login'
    }
  }

  return {
    loading,
    isAdminAuthenticated,
    adminUser,
    refresh,
    logout,
  }
}
