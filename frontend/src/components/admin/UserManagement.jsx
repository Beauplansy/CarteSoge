import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { userAPI } from '../../services/api'
import {
  Box, Paper, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Switch, FormControlLabel,
  Alert, Chip, Grid, FormControl, InputLabel, Select
} from '@mui/material'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon
} from '@mui/icons-material'

const UserManagement = () => {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: '',
    branch: '',
    phone: '',
    password: ''
  })

  const roleChoices = [
    { value: 'secretary', label: 'Secrétaire de Crédit' },
    { value: 'officer', label: 'Officier de Crédit' },
    { value: 'manager', label: 'Responsable de Crédit' }
  ]

  const branchChoices = [
    'Aeroport2', 'Direction Général SogeCarte', 'Cap Haïtien', 'Cayes',
    'Conseil d administration SogeCarte', 'Frère', 'Lalue', 'Pétion-ville IV',
    'Pétion-ville 3', 'Rue Pavée', 'Turgeau', 'Autres'
  ]

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await userAPI.getUsers()
      setUsers(response.data)
    } catch (error) {
      setError('Erreur lors du chargement des utilisateurs')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user)
      setUserForm({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        branch: user.branch,
        phone: user.phone,
        password: ''
      })
    } else {
      setEditingUser(null)
      setUserForm({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: '',
        branch: '',
        phone: '',
        password: ''
      })
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setEditingUser(null)
    setError('')
  }

  const handleFormChange = (e) => {
    setUserForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      if (editingUser) {
        // Mise à jour
        const updateData = { ...userForm }
        if (!updateData.password) {
          delete updateData.password
        }
        await userAPI.updateUser(editingUser.id, updateData)
        setSuccess('Utilisateur mis à jour avec succès')
      } else {
        // Création
        await userAPI.createUser(userForm)
        setSuccess('Utilisateur créé avec succès')
      }
      
      handleCloseDialog()
      loadUsers()
      
      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError(error.response?.data?.message || 'Erreur lors de la sauvegarde')
    }
  }

  const handleToggleActive = async (userId, currentStatus) => {
    try {
      await userAPI.toggleUser(userId)
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, is_active: !currentStatus }
          : user
      ))
      setSuccess(`Utilisateur ${!currentStatus ? 'activé' : 'désactivé'} avec succès`)
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Erreur lors de la modification du statut')
    }
  }

  const getRoleColor = (role) => {
    const colors = {
      'manager': 'error',
      'officer': 'warning',
      'secretary': 'info'
    }
    return colors[role] || 'default'
  }

  const getRoleLabel = (role) => {
    const labels = {
      'manager': 'Responsable',
      'officer': 'Officier',
      'secretary': 'Secrétaire'
    }
    return labels[role] || role
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Gestion des Utilisateurs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nouvel Utilisateur
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom Complet</TableCell>
              <TableCell>Nom d'utilisateur</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Succursale</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Date Création</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.first_name} {user.last_name}
                </TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={getRoleLabel(user.role)} 
                    color={getRoleColor(user.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{user.branch}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.is_active ? 'Actif' : 'Inactif'} 
                    color={user.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.date_joined).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleOpenDialog(user)}
                    color="primary"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleToggleActive(user.id, user.is_active)}
                    color={user.is_active ? 'error' : 'success'}
                    size="small"
                  >
                    {user.is_active ? <LockIcon /> : <LockOpenIcon />}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog de création/édition */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Modifier Utilisateur' : 'Nouvel Utilisateur'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom"
                  name="first_name"
                  value={userForm.first_name}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Prénom"
                  name="last_name"
                  value={userForm.last_name}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nom d'utilisateur"
                  name="username"
                  value={userForm.username}
                  onChange={handleFormChange}
                  required
                  disabled={!!editingUser}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={userForm.email}
                  onChange={handleFormChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Rôle</InputLabel>
                  <Select
                    name="role"
                    value={userForm.role}
                    onChange={handleFormChange}
                    label="Rôle"
                  >
                    {roleChoices.map((choice) => (
                      <MenuItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Succursale</InputLabel>
                  <Select
                    name="branch"
                    value={userForm.branch}
                    onChange={handleFormChange}
                    label="Succursale"
                  >
                    {branchChoices.map((branch) => (
                      <MenuItem key={branch} value={branch}>
                        {branch}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Téléphone"
                  name="phone"
                  value={userForm.phone}
                  onChange={handleFormChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={editingUser ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
                  name="password"
                  type="password"
                  value={userForm.password}
                  onChange={handleFormChange}
                  required={!editingUser}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Annuler</Button>
            <Button type="submit" variant="contained">
              {editingUser ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  )
}

export default UserManagement