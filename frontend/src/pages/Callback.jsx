import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Callback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const installationId = params.get('installation_id')

    if (installationId) {
      localStorage.setItem('prguard_installation_id', installationId)
      setTimeout(() => navigate('/dashboard'), 2000)
    } else {
      setTimeout(() => navigate('/'), 2000)
    }
  }, [navigate])

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white font-medium">Installing PRGuard...</p>
        <p className="text-gray-500 text-sm mt-1">Redirecting to dashboard</p>
      </div>
    </main>
  )
}