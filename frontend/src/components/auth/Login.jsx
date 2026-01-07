import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useInactivity } from '../../contexts/InactivityContext'
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material'

// Import du logo
import logo from '../../assets/logo.png'
// Background image (nom exact du fichier)
import bg from '../../assets/Background.jpeg'

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const { resetTimer } = useInactivity() // Ajout du resetTimer
  const navigate = useNavigate()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Preload background image for better UX and lazy-load
    const img = new Image()
    img.src = bg
    img.onload = () => setLoaded(true)
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(formData.username, formData.password)
      
      if (result.success) {
        resetTimer() // Reset du timer d'inactivité après connexion
        navigate('/dashboard')
      } else {
        setError(result.error || 'Identifiants incorrects')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        margin: 0,
        padding: 2,
        overflow: 'auto',
        position: 'relative'
      }}
    >
      {/* Background image overlay with fade-in */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: loaded ? 'block' : 'none',
          backgroundImage: `url(${bg})`,
          backgroundSize: 'cover',
          backgroundPosition: { xs: 'top', md: 'center' },
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
          '&::after': {
            content: "''",
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.45)'
          }
        }}
      />

      <Paper 
        sx={{
          width: '100%',
          maxWidth: 400,
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          position: 'relative',
          zIndex: 1,
          boxSizing: 'border-box'
        }}
      >
        {/* Logo au centre au-dessus du titre */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Box
            component="img"
            src={logo}
            alt="Logo SOGEAPP CREDIT"
            sx={{
              width: { xs: '90px', md: '120px' },
              height: { xs: '60px', md: '80px' },
              objectFit: 'contain',
              marginBottom: '16px',
              display: 'inline-block'
            }}
          />
        </Box>

        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ letterSpacing: '0.08em', fontWeight: 700, color: '#0b5fff' }}
        >
          SOGEAPP CREDIT
        </Typography>
        <Typography variant="h5" align="center" gutterBottom color="textSecondary" sx={{ mb: 4 }}>
          Connexion
        </Typography>
        
        {error && (
          <Alert role="alert" aria-live="assertive" severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Nom d'utilisateur"
            name="username"
            value={formData.username}
            onChange={handleChange}
            sx={{ mb: 2 }}
            autoFocus
            autoComplete="username"
            inputProps={{ 'aria-label': 'Nom d\'utilisateur' }}
          />
          <TextField
            fullWidth
            label="Mot de passe"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            sx={{ mb: 4 }}
            autoComplete="current-password"
            inputProps={{ 'aria-label': 'Mot de passe' }}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.5 }}
          >
            {loading ? <CircularProgress size={24} /> : 'SE CONNECTER'}
          </Button>
        </Box>

        {/* Rôles disponibles */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            <strong>Rôles disponibles:</strong>
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Chip label="Responsable" color="error" size="small" />
            <Chip label="Officier" color="warning" size="small" />
            <Chip label="Secrétaire" color="success" size="small" />
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

export default Login