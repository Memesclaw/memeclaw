import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ChatPage from './pages/ChatPage'
import SkillsPage from './pages/SkillsPage'
import SettingsPage from './pages/SettingsPage'
import { WebSocketProvider, useWebSocket } from './context/WebSocketContext'

function AppContent() {
  const [isConnected, setIsConnected] = useState(false)
  const { isConnected: wsConnected } = useWebSocket()

  useEffect(() => {
    setIsConnected(wsConnected)
  }, [wsConnected])

  return (
    <Layout isConnected={isConnected}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/skills" element={<SkillsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <WebSocketProvider>
      <Router>
        <AppContent />
      </Router>
    </WebSocketProvider>
  )
}

export default App
