import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import axios from 'axios'
import {
  Box, Paper, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Grid, TextField, MenuItem, FormControl, InputLabel, Select,
  Dialog, DialogTitle, DialogContent, Alert, CircularProgress,
  Chip, Card, CardContent
} from '@mui/material'
import {
  Assessment as AssessmentIcon,
  GetApp as DownloadIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const AuditLog = () => {
  const { user, can } = useAuth()
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stats, setStats] = useState(null)
  const [selectedLog, setSelectedLog] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Filtres
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    resource_type: '',
    status: '',
    date_from: null,
    date_to: null
  })

  const [users, setUsers] = useState([])

  const ACTION_CHOICES = [
    { value: 'login', label: 'Connexion' },
    { value: 'logout', label: 'Déconnexion' },
    { value: 'create_app', label: 'Création Dossier' },
    { value: 'update_app', label: 'Modification Dossier' },
    { value: 'delete_app', label: 'Suppression Dossier' },
    { value: 'assign_officer', label: 'Assignation Officier' },
    { value: 'generate_report', label: 'Génération Rapport' },
    { value: 'export_data', label: 'Export Données' },
    { value: 'create_user', label: 'Création Utilisateur' },
    { value: 'update_user', label: 'Modification Utilisateur' },
    { value: 'delete_user', label: 'Suppression Utilisateur' },
  ]

  const RESOURCE_TYPES = [
    { value: 'CreditApplication', label: 'Application de Crédit' },
    { value: 'User', label: 'Utilisateur' },
    { value: 'Report', label: 'Rapport' },
  ]

  useEffect(() => {
    loadAuditLogs()
    loadStats()
    loadUsers()
  }, [])

  const loadAuditLogs = async () => {
    try {
      setLoading(true)
      setError('')

      const params = {}
      if (filters.user) params.user = filters.user
      if (filters.action) params.action = filters.action
      if (filters.resource_type) params.resource_type = filters.resource_type
      if (filters.status) params.status = filters.status

      const response = await axios.get(
        `${API_BASE_URL}/auth/audit_logs/`,
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      )

      setAuditLogs(response.data.results || [])
    } catch (err) {
      setError('Erreur lors du chargement des logs d\'audit')
      console.error('Erreur:', err)
      setAuditLogs([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/auth/audit_logs/stats/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      )
      setStats(response.data)
    } catch (err) {
      console.error('Erreur stats:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/auth/users/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      )
      const usersData = Array.isArray(response.data) ? response.data : []
      setUsers(usersData)
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err)
    }
  }

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleApplyFilters = () => {
    loadAuditLogs()
  }

  const handleReset = () => {
    setFilters({
      user: '',
      action: '',
      resource_type: '',
      status: '',
      date_from: null,
      date_to: null
    })
    loadAuditLogs()
  }

  const handleShowDetails = (log) => {
    setSelectedLog(log)
    setDialogOpen(true)
  }

  const getStatusChip = (status) => {
    return (
      <Chip
        label={status === 'success' ? 'Succès' : 'Échoué'}
        color={status === 'success' ? 'success' : 'error'}
        size="small"
      />
    )
  }

  // Vérifier la permission
  if (!can('manage_users')) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error">
          Vous n'avez pas l'accès à cette page. Seuls les managers peuvent consulter les logs d'audit.
        </Alert>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon /> Journal d'Audit
        </Typography>
      </Box>

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Logs
                </Typography>
                <Typography variant="h4">
                  {stats.total_logs}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Logs Aujourd'hui
                </Typography>
                <Typography variant="h4">
                  {stats.logs_today}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Logs 7 Jours
                </Typography>
                <Typography variant="h4">
                  {stats.logs_last_7_days}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Actions Échouées
                </Typography>
                <Typography variant="h4" color="error">
                  {stats.failed_actions}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtres */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Filtres
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Utilisateur</InputLabel>
                <Select
                  value={filters.user}
                  onChange={(e) => handleFilterChange('user', e.target.value)}
                  label="Utilisateur"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {users.map(u => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  label="Action"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {ACTION_CHOICES.map(action => (
                    <MenuItem key={action.value} value={action.value}>
                      {action.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Type Ressource</InputLabel>
                <Select
                  value={filters.resource_type}
                  onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                  label="Type Ressource"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {RESOURCE_TYPES.map(type => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  <MenuItem value="success">Succès</MenuItem>
                  <MenuItem value="failed">Échoué</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
              >
                Appliquer Filtres
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
              >
                Réinitialiser
              </Button>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>

      {/* Messages d'erreur */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau des logs */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date/Heure</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Utilisateur</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Action</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ressource</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>IP</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Statut</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Détails</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {auditLogs.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    {new Date(log.timestamp).toLocaleString('fr-FR')}
                  </TableCell>
                  <TableCell>
                    {log.user_name || log.user}
                  </TableCell>
                  <TableCell>
                    {log.action_display}
                  </TableCell>
                  <TableCell>
                    {log.resource_display ? (
                      <Typography variant="body2">{log.resource_display}</Typography>
                    ) : (
                      <Typography variant="body2" color="textSecondary">-</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      <code>{log.ip_address || '-'}</code>
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(log.status)}
                  </TableCell>
                  <TableCell>
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleShowDetails(log)}
                      >
                        Voir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {auditLogs.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
          <Typography color="textSecondary">
            Aucun log d'audit trouvé
          </Typography>
        </Paper>
      )}

      {/* Dialog pour voir les détails */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Détails de l'Action</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedLog.action_display}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Par: {selectedLog.user_name} | {new Date(selectedLog.timestamp).toLocaleString('fr-FR')}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                IP: {selectedLog.ip_address}
              </Typography>

              {Object.keys(selectedLog.changes).length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Changements:
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                    <pre>{JSON.stringify(selectedLog.changes, null, 2)}</pre>
                  </Paper>
                </Box>
              )}

              {selectedLog.error_message && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {selectedLog.error_message}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default AuditLog
