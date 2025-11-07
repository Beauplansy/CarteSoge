import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { userAPI } from '../../services/api'
import {
  Container, Paper, TextField, Button, Typography,
  Box, Grid, Alert, Card, CardContent, Chip,
  Divider
} from '@mui/material'
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CalendarToday as CalendarIcon
} from '@mui/icons-material'

const UserProfile = () => {
  const { user, updateProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)

  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    branch: user?.branch || ''
  })

  const handleChange = (e) => {
    setProfileData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await userAPI.updateUser(user.id, profileData)
      updateProfile(response.data)
      setSuccess('Profil mis à jour avec succès')
      setEditMode(false)
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  const getRoleLabel = (role) => {
    const labels = {
      'manager': 'Responsable de Crédit',
      'officer': 'Officier de Crédit',
      'secretary': 'Secrétaire de Crédit'
    }
    return labels[role] || role
  }

  const getRoleColor = (role) => {
    const colors = {
      'manager': 'error',
      'officer': 'warning',
      'secretary': 'info'
    }
    return colors[role] || 'default'
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Mon Profil
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Grid container spacing={4}>
          {/* Informations de base */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <PersonIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                </Box>
                
                <Typography variant="h6" align="center" gutterBottom>
                  {user?.first_name} {user?.last_name}
                </Typography>
                
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                  <Chip 
                    label={getRoleLabel(user?.role)}
                    color={getRoleColor(user?.role)}
                  />
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <BusinessIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {user?.branch || 'Non spécifié'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {user?.email}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PhoneIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    {user?.phone || 'Non spécifié'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2">
                    Membre depuis {new Date(user?.date_joined).toLocaleDateString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Formulaire d'édition */}
          <Grid item xs={12} md={8}>
            <Box component="form" onSubmit={handleSubmit}>
              <Typography variant="h6" gutterBottom>
                Informations Personnelles
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nom"
                    name="last_name"
                    value={profileData.last_name}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Prénom"
                    name="first_name"
                    value={profileData.first_name}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Email"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleChange}
                    disabled={!editMode}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Téléphone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleChange}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Succursale"
                    name="branch"
                    value={profileData.branch}
                    onChange={handleChange}
                    disabled={!editMode}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                {!editMode ? (
                  <Button
                    variant="contained"
                    onClick={() => setEditMode(true)}
                  >
                    Modifier le Profil
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                    >
                      {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditMode(false)
                        setProfileData({
                          first_name: user?.first_name || '',
                          last_name: user?.last_name || '',
                          email: user?.email || '',
                          phone: user?.phone || '',
                          branch: user?.branch || ''
                        })
                      }}
                    >
                      Annuler
                    </Button>
                  </>
                )}
                
                <Button
                  variant="outlined"
                  onClick={() => window.location.href = '/change-password'}
                >
                  Changer le mot de passe
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  )
}

export default UserProfile