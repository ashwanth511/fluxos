
import { Routes, Route } from 'react-router-dom'

import './App.css'

import LandingPage from './Pages/LandingPage'
import DashboardPage from './Pages/Dashboard'
import BuilderPage from './Pages/BuilderPage'
import SettingsPage from './Pages/Settings'
import TokenPage from './Pages/TokenPage'
function App() {


  return (
    <>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/builder" element={<BuilderPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/token" element={<TokenPage   />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
    </>
  )
}

export default App
