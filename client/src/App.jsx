import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import Callback from './pages/Callback'
import NotFound from './pages/NotFound'

export const ThemeContext = createContext('dark')

function App() {
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    document.body.className = `theme-${theme}`
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  )
}

export default App