import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const InactivityContext = createContext()

export const useInactivity = () => {
  const context = useContext(InactivityContext)
  if (!context) {
    throw new Error('useInactivity must be used within an InactivityProvider')
  }
  return context
}

export const InactivityProvider = ({ children }) => {
  const [isInactive, setIsInactive] = useState(false)
  const [lastActivity, setLastActivity] = useState(Date.now())
  const INACTIVITY_TIMEOUT = 10 * 60 * 1000 // 10 minutes en millisecondes
  const [throttleTimer, setThrottleTimer] = useState(null)

  // Réinitialiser le timer d'activité avec throttle
  const resetTimer = useCallback(() => {
    setLastActivity(Date.now())
    if (isInactive) {
      setIsInactive(false)
    }
  }, [isInactive])

  // Wrapper throttle pour limiter appels répétés
  const throttledResetTimer = useCallback(() => {
    if (!throttleTimer) {
      resetTimer()
      const timer = setTimeout(() => setThrottleTimer(null), 500) // throttle de 500ms
      setThrottleTimer(timer)
    }
  }, [throttleTimer, resetTimer])

  // Vérifier l'inactivité
  useEffect(() => {
    const checkInactivity = () => {
      const currentTime = Date.now()
      const timeSinceLastActivity = currentTime - lastActivity

      if (timeSinceLastActivity > INACTIVITY_TIMEOUT && !isInactive) {
        setIsInactive(true)
      }
    }

    const interval = setInterval(checkInactivity, 30000) // Vérifier toutes les 30 secondes (au lieu de 1 sec)
    return () => clearInterval(interval)
  }, [lastActivity, isInactive, INACTIVITY_TIMEOUT])

  // Écouter les événements utilisateur
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

    const handleActivity = () => {
      throttledResetTimer()
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [throttledResetTimer])

  // Nettoyer le throttle timer au unmount
  useEffect(() => {
    return () => {
      if (throttleTimer) clearTimeout(throttleTimer)
    }
  }, [throttleTimer])

  const value = {
    isInactive,
    resetTimer,
    lastActivity
  }

  return (
    <InactivityContext.Provider value={value}>
      {children}
    </InactivityContext.Provider>
  )
}