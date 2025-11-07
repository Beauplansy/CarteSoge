import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/common/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'
import Login from './components/auth/Login'
import ChangePassword from './components/auth/ChangePassword'
import Dashboard from './components/dashboard/Dashboard'
import UserManagement from './components/admin/UserManagement'
import ApplicationList from './components/applications/ApplicationList'
import CreateApplication from './components/applications/CreateApplication'
import ApplicationDetail from './components/applications/ApplicationDetail'
import UserProfile from './components/profile/UserProfile'
import Reports from './components/admin/Reports'
import './App.css'

function App() {
  return (
    <Router>
      <AuthProvider>
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
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App