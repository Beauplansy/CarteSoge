import React, { createContext, useState, useContext, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const userData = localStorage.getItem('userData')
    
    if (token && userData) {
      setUser(JSON.parse(userData))
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      const response = await authAPI.login({ username, password })
      const { access, refresh, user } = response.data
      
      localStorage.setItem('accessToken', access)
      localStorage.setItem('refreshToken', refresh)
      localStorage.setItem('userData', JSON.stringify(user))
      
      setUser(user)
      setIsAuthenticated(true)
      
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Erreur de connexion'
      }
    }
  }

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        await authAPI.logout({ refresh_token: refreshToken })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userData')
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const updateProfile = (userData) => {
    setUser(userData)
    localStorage.setItem('userData', JSON.stringify(userData))
  }

  const hasPermission = (requiredRole) => {
    if (!user) return false
    
    const roleHierarchy = {
      'secretary': 1,
      'officer': 2,
      'manager': 3
    }
    
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
  }

  const can = (action, resource = null) => {
    if (!user) return false
    const permissions = {
      'secretary': [
        'view_dashboard',
        'create_application',
        'view_applications',
        'assign_officer',
        'view_profile'
      ],
      'officer': [
        'view_dashboard',
        'view_applications',
        'update_application',
        'process_application',
        'view_profile'
      ],
      'manager': [
        'view_dashboard',
        'view_applications',
        'create_application',
        'update_application',
        'modify_client_info',  // Nouvelle permission pour modifier les infos client
        'delete_application',
        'assign_officer',
        'manage_users',
        'view_reports',
        'view_profile'
      ]
    }
    
    return permissions[user.role]?.includes(action) || false
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateProfile,
    hasPermission,
    can
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext