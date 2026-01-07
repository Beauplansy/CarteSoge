import React, { createContext, useContext, useState, useCallback } from 'react'

const ErrorContext = createContext()

export const useError = () => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

export const ErrorProvider = ({ children }) => {
  const [errors, setErrors] = useState([])

  // Ajouter une erreur avec auto-dismiss (5s par défaut)
  const addError = useCallback((message, severity = 'error', duration = 5000) => {
    const id = Date.now()
    const error = { id, message, severity }
    
    setErrors(prev => [...prev, error])
    
    // Auto-dismiss après duration
    if (duration > 0) {
      setTimeout(() => removeError(id), duration)
    }
    
    return id
  }, [])

  // Retirer une erreur
  const removeError = useCallback((id) => {
    setErrors(prev => prev.filter(err => err.id !== id))
  }, [])

  // Vider toutes les erreurs
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  // Parse erreurs API
  const handleApiError = useCallback((error) => {
    let message = 'Une erreur est survenue'
    let severity = 'error'

    if (error.response?.status === 401) {
      message = 'Votre session a expiré'
      severity = 'warning'
    } else if (error.response?.status === 403) {
      message = 'Vous n\'avez pas la permission d\'accéder à cette ressource'
      severity = 'warning'
    } else if (error.response?.status === 404) {
      message = 'Ressource non trouvée'
    } else if (error.response?.status === 500) {
      message = 'Erreur serveur - veuillez réessayer plus tard'
    } else if (error.response?.data?.detail) {
      message = error.response.data.detail
    } else if (error.response?.data?.error) {
      message = error.response.data.error
    } else if (error.message) {
      message = error.message
    }

    addError(message, severity)
  }, [addError])

  const value = {
    errors,
    addError,
    removeError,
    clearErrors,
    handleApiError
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}

export default ErrorContext
