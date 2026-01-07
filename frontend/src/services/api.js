// services/api.js - VERSION CORRIGÉE
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Intercepteur pour ajouter le token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Intercepteur de réponse pour gérer les 401 et refresh automatique
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Si erreur 401 et pas déjà tenté un refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
            refresh: refreshToken
          })
          const { access } = response.data
          localStorage.setItem('accessToken', access)
          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh échoué, déconnecter
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('userData')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // Pas de refresh token, déconnecter
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Exporter instance pour permettre à App de configurer error handler
export const configureApiErrorHandler = (handleError) => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      handleError(error)
      return Promise.reject(error)
    }
  )
}


// API d'authentification
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: (data) => api.post('/auth/logout/', data),
}

// API des utilisateurs
export const userAPI = {
  getUsers: () => api.get('/auth/users/'),
  createUser: (userData) => api.post('/auth/users/', userData),
  updateUser: (id, userData) => api.put(`/auth/users/${id}/`, userData),
  toggleUser: (id) => api.post(`/auth/users/${id}/toggle_active/`),
}

// API des applications de crédit - CORRIGÉ
export const applicationAPI = {
  getApplications: (params = {}) => api.get('/auth/applications/', { params }),
  getApplication: (id) => api.get(`/auth/applications/${id}/`),
  createApplication: (data) => api.post('/auth/applications/', data),
  updateApplication: (id, data) => api.patch(`/auth/applications/${id}/`, data),
  assignOfficer: (id, data) => api.post(`/auth/applications/${id}/assign_officer/`, data),
  getApplicationHistory: (id) => api.get(`/auth/applications/${id}/history/`),
}

// API des rapports - CORRIGÉ
export const reportAPI = {
  getDashboardStats: () => api.get('/auth/dashboard/stats/'), // ← /auth/ ajouté
  generateReport: (data) => api.post('/auth/reports/generate_report/', data),
  exportCsv: (data) => api.post('/auth/reports/export_csv/', data, {
    responseType: 'blob'
  })
}

// API des notifications - CORRIGÉ
export const notificationAPI = {
  getNotifications: () => api.get('/auth/notifications/'),
  markAllRead: () => api.post('/auth/notifications/mark_all_read/'),
}

export default api