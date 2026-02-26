import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useAuthStore } from './hooks/useAuth'

// Pages
import LoginPage from './pages/LoginPage'
import WorkspacePage from './pages/WorkspacePage'
import ProspectingPage from './pages/ProspectingPage'
import DataIntakePage from './pages/DataIntakePage'
import OpsHealthPage from './pages/OpsHealthPage'
import TurbineDetailPage from './pages/TurbineDetailPage'
import FinancialPage from './pages/FinancialPage'
import MaintenancePage from './pages/MaintenancePage'

// Google OAuth Client ID - Must be configured in .env file
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/workspace" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
          <Route path="/prospecting" element={<ProtectedRoute><ProspectingPage /></ProtectedRoute>} />
          <Route path="/data-intake" element={<ProtectedRoute><DataIntakePage /></ProtectedRoute>} />
          <Route path="/ops-health" element={<ProtectedRoute><OpsHealthPage /></ProtectedRoute>} />
          <Route path="/turbine/:turbineId" element={<ProtectedRoute><TurbineDetailPage /></ProtectedRoute>} />
          <Route path="/financial" element={<ProtectedRoute><FinancialPage /></ProtectedRoute>} />
          <Route path="/maintenance" element={<ProtectedRoute><MaintenancePage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </GoogleOAuthProvider>
  )
}

function ProtectedRoute({ children }) {
  const { user } = useAuthStore()
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

export default App
