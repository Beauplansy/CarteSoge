import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { InactivityProvider } from './contexts/InactivityContext'
import { ErrorProvider, useError } from './contexts/ErrorContext'
import Layout from './components/common/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import ErrorSnackbar from './components/common/ErrorSnackbar'
import Login from './components/auth/Login'
import ChangePassword from './components/auth/ChangePassword'
import Dashboard from './components/dashboard/Dashboard'
import UserManagement from './components/admin/UserManagement'
import AuditLog from './components/admin/AuditLog'
import ApplicationList from './components/applications/ApplicationList'
import CreateApplication from './components/applications/CreateApplication'
import ApplicationDetail from './components/applications/ApplicationDetail'
import UserProfile from './components/profile/UserProfile'
import Reports from './components/admin/Reports'
import ReconnectModal from './components/auth/ReconnectModal'
import { configureApiErrorHandler } from './services/api'
import './App.css'
import { ThemeProvider } from '@mui/material/styles'
import theme from './theme'

// Composant interne pour utiliser useError (doit être DANS ErrorProvider)
function AppContent() {
  const { handleApiError } = useError()

  // Configure global error handler
  React.useEffect(() => {
    configureApiErrorHandler(handleApiError)
  }, [handleApiError])

  return (
    <InactivityProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="applications">
            <Route index element={<ApplicationList />} />
            <Route path="create" element={<CreateApplication />} />
            <Route path=":id" element={<ApplicationDetail />} />
          </Route>
          <Route path="profile" element={<UserProfile />} />
          <Route path="admin">
            <Route path="users" element={
              <ProtectedRoute requiredRole="manager">
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="reports" element={
              <ProtectedRoute requiredRole="manager">
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="audit" element={
              <ProtectedRoute requiredRole="manager">
                <AuditLog />
              </ProtectedRoute>
            } />
          </Route>
        </Route>
      </Routes>
      
      {/* Modal de reconnexion global */}
      <ReconnectModal />
      
      {/* Snackbar global pour erreurs */}
      <ErrorSnackbar />
    </InactivityProvider>
  )
}

function App() {
  return (
    <Router future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <AuthProvider>
        <ErrorProvider>
          <ThemeProvider theme={theme}>
            <AppContent />
          </ThemeProvider>
        </ErrorProvider>
      </AuthProvider>
    </Router>
  )
}

export default App