import React from 'react'
import { Snackbar, Alert } from '@mui/material'
import { useError } from '../../contexts/ErrorContext'

const ErrorSnackbar = () => {
  const { errors, removeError } = useError()

  if (!errors || errors.length === 0) return null

  // Afficher seulement la première erreur (queue)
  const error = errors[0]

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return
    removeError(error.id)
  }

  return (
    <Snackbar
      open={Boolean(error)}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={handleClose}
        severity={error.severity || 'error'}
        sx={{ width: '100%' }}
      >
        {error.message}
      </Alert>
    </Snackbar>
  )
}

export default ErrorSnackbar
