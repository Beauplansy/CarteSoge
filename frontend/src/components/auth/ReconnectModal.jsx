import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert
} from '@mui/material'
import { Warning as WarningIcon } from '@mui/icons-material'
import { useInactivity } from '../../contexts/InactivityContext'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const ReconnectModal = () => {
  const { isInactive, resetTimer } = useInactivity()
  const { logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const handleReconnect = () => {
    resetTimer()
    navigate('/login')
  }

  const handleLogout = () => {
    logout()
    resetTimer()
    navigate('/login')
  }

  if (!isInactive || !isAuthenticated) {
    return null
  }

  return (
    <Dialog
      open={true}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      BackdropProps={{ style: { backgroundColor: 'rgba(0,0,0,0.8)' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          <Typography variant="h6" fontWeight="bold">
            Session expirée
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Votre session a expiré en raison d'une inactivité prolongée.
        </Alert>
        <Typography variant="body1">
          Pour des raisons de sécurité, vous avez été déconnecté après 10 minutes d'inactivité.
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
          Veuillez vous reconnecter pour continuer.
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ padding: 3 }}>
        <Button
          variant="outlined"
          onClick={handleLogout}
          sx={{ mr: 1 }}
        >
          Se déconnecter
        </Button>
        <Button
          variant="contained"
          onClick={handleReconnect}
          autoFocus
        >
          Se reconnecter
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReconnectModal