import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useInactivity } from '../../contexts/InactivityContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, requiredRole, requiredPermission }) => {
  const { isAuthenticated, loading, user, hasPermission, can, checkTokenValidity } = useAuth()
  const { isInactive } = useInactivity()

  if (loading) {
    return <LoadingSpinner />
  }

  // Vérifications de sécurité
  if (!isAuthenticated || isInactive || !checkTokenValidity()) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !hasPermission(requiredRole)) {
    return <Navigate to="/dashboard" replace />
  }

  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute