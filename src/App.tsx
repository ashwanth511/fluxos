import { Routes, Route } from 'react-router-dom'
import { WalletProvider } from './context/WalletContext'

import './App.css'

import LandingPage from './Pages/LandingPage'
import DashboardPage from './Pages/Dashboard'
import BuilderPage from './Pages/BuilderPage'
import SettingsPage from './Pages/Settings'
import TokenPage from './Pages/TokenPage'
import TokensPage from './Pages/Tokens'
import TokenViewPage from './Pages/TokenView'
import WalletPage from './Pages/Wallet'

function App() {
  return (
    <WalletProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/token" element={<TokenPage />} />
        <Route path="/tokens" element={<TokensPage />} />
        <Route path="/token-view/:id" element={<TokenViewPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </WalletProvider>
  )
}

export default App
