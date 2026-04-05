import React, { useState, useEffect, createContext } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Callback from './pages/Callback'
import NotFound from './pages/NotFound'

export const ThemeContext = createContext('dark')

function App() {
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('prguard-theme') || 'dark'
  )

  useEffect(() => {
    document.body.className = `theme-${theme}`
    localStorage.setItem('prguard-theme', theme)
  }, [theme])

  const toggleTheme = () =>
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/"              element={<Landing />}   />
          <Route path="/login"         element={<Login />}     />
          <Route path="/signup"        element={<Signup />}    />
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/auth/callback" element={<Callback />}  />
          <Route path="*"              element={<NotFound />}  />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}

export default App