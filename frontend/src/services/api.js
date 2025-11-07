import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000/api'

// Configuration axios
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

// Intercepteur pour rafraîchir le token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
          refresh: refreshToken
        })
        
        const newAccessToken = response.data.access
        localStorage.setItem('accessToken', newAccessToken)
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('userData')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)

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

// API des applications de crédit
export const applicationAPI = {
  getApplications: (params = {}) => api.get('/auth/applications/', { params }),
  getApplication: (id) => api.get(`/auth/applications/${id}/`),
  createApplication: (data) => api.post('/auth/applications/', data),
  updateApplication: (id, data) => api.patch(`/auth/applications/${id}/`, data),
  assignOfficer: (id, data) => api.post(`/auth/applications/${id}/assign_officer/`, data),
  getApplicationHistory: (id) => api.get(`/auth/applications/${id}/history/`),
}


// API des rapports
export const reportAPI = {
  generateReport: (data) => api.post('/auth/reports/generate_report/', data),
  getDashboardStats: () => api.get('/auth/dashboard/stats/'),
}

// API des notifications
export const notificationAPI = {
  getNotifications: () => api.get('/auth/notifications/'),
  markAllRead: () => api.post('/auth/notifications/mark_all_read/'),
}

export default api