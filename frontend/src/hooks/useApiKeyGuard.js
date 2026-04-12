import { useState, useEffect } from 'react'
import { getApiKeyStatus } from '../api/client'

export const useApiKeyGuard = () => {
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    let mounted = true
    const checkKey = async () => {
      try {
        const status = await getApiKeyStatus()
        if (mounted) {
          setHasKey(Boolean(status?.has_any_key))
        }
      } catch {
        if (mounted) {
          setHasKey(false)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    checkKey()
    
    // Poll backend status to keep chat guard in sync with settings panel changes.
    const interval = setInterval(checkKey, 8000)
    window.addEventListener('prguard:api-keys-updated', checkKey)
    
    return () => {
      mounted = false
      clearInterval(interval)
      window.removeEventListener('prguard:api-keys-updated', checkKey)
    }
  }, [])

  return { hasKey, loading }
}
