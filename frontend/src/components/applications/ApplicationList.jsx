import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { applicationAPI, userAPI } from '../../services/api'
import {
  Box, Paper, Typography, Button, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Chip, TextField, IconButton,
  FormControl, InputLabel, Select, Grid, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Alert,
  MenuItem
} from '@mui/material'
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material'

const ApplicationList = () => {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [assignDialog, setAssignDialog] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState(null)
  const [officers, setOfficers] = useState([])
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadApplications()
    if (can('assign_officer')) {
      loadOfficers()
    }
  }, [statusFilter, typeFilter, searchTerm])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const params = {}
      if (statusFilter) params.statut = statusFilter
      if (typeFilter) params.type_dossier = typeFilter
      if (searchTerm) params.search = searchTerm

      const response = await applicationAPI.getApplications(params)
      console.log('Response applications:', response.data)
      
      let appsData = response.data;
      if (appsData && appsData.results && Array.isArray(appsData.results)) {
        appsData = appsData.results;
      } else if (appsData && appsData.data && Array.isArray(appsData.data)) {
        appsData = appsData.data;
      } else if (!Array.isArray(appsData)) {
        console.error('Format de données applications invalide:', appsData);
        appsData = [];
      }
      
      setApplications(appsData)
    } catch (error) {
      console.error('Error loading applications:', error)
      setError('Erreur lors du chargement des dossiers')
    } finally {
      setLoading(false)
    }
  }

  const loadOfficers = async () => {
    try {
      const response = await userAPI.getUsers()
      console.log('Response users:', response.data)
      
      let usersData = response.data;
      
      if (usersData && usersData.results && Array.isArray(usersData.results)) {
        usersData = usersData.results;
      } else if (usersData && usersData.data && Array.isArray(usersData.data)) {
        usersData = usersData.data;
      } else if (!Array.isArray(usersData)) {
        console.error('Format de données utilisateurs invalide:', usersData);
        usersData = [];
      }
      
      const officersList = usersData.filter(u => u.role === 'officer' && u.is_active)
      console.log('Officiers filtrés:', officersList)
      setOfficers(officersList)
    } catch (error) {
      console.error('Error loading officers:', error)
      setOfficers([])
    }
  }

  const handleSearch = (e) => {
    setSearchTerm(e.target.value)
  }

  const handleAssignClick = (application) => {
    setSelectedApplication(application)
    setSelectedOfficer('')
    setAssignDialog(true)
  }

  const handleAssignOfficer = async () => {
    if (!selectedApplication || !selectedOfficer) return

    console.log('🔧 Début assignation:', {
      dossierId: selectedApplication.id,
      officierId: selectedOfficer,
      utilisateur: user
    })

    try {
      const response = await applicationAPI.assignOfficer(selectedApplication.id, { 
        officer_id: parseInt(selectedOfficer)
      })
      
      console.log('✅ Réponse assignation:', response.data)
      
      setApplications(prevApplications => 
        prevApplications.map(app => 
          app.id === selectedApplication.id 
            ? { 
                ...app, 
                officer_credit: selectedOfficer,
                officer_name: response.data.officer_name || 
                  officers.find(o => o.id === parseInt(selectedOfficer))?.first_name + ' ' + 
                  officers.find(o => o.id === parseInt(selectedOfficer))?.last_name
              }
            : app
        )
      )
      
      setAssignDialog(false)
      setSuccess(`Officier assigné avec succès au dossier ${selectedApplication.application_id}!`)
      setError('')
      
      setTimeout(() => setSuccess(''), 3000)
      
    } catch (error) {
      console.error('❌ Erreur assignation complète:', error)
      console.error('Status:', error.response?.status)
      console.error('Data:', error.response?.data)
      
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.detail || 
                          error.response?.data?.message ||
                          'Erreur lors de l\'assignation'
      
      setError('Erreur: ' + errorMessage)
      setSuccess('')
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'en_attente': 'warning',
      'approuve': 'success',
      'rejete': 'error'
    }
    return colors[status] || 'default'
  }

  // Fonction pour formater le texte en majuscules pour l'affichage
  const formatToUpperCase = (text) => {
    if (!text) return ''
    return typeof text === 'string' ? text.toUpperCase() : text
  }

  const statusChoices = [
    { value: '', label: 'Tous les statuts' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'approuve', label: 'Approuvé' },
    { value: 'rejete', label: 'Rejeté' }
  ]

  const typeChoices = [
    { value: '', label: 'Tous les types' },
    { value: 'pre_approuve', label: 'Pre-Approuvé' },
    { value: 'vente_croisee', label: 'Vente-croisée' },
    { value: 'campagne', label: 'Campagne' }
  ]

  const canCreateApplication = can('create_application')
  const canAssignOfficer = can('assign_officer')

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Liste des Dossiers
        </Typography>
        
        {canCreateApplication && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/applications/create')}
          >
            Nouveau Dossier
          </Button>
        )}
      </Box>

      {/* Alertes */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* Filtres et recherche */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Rechercher par ID, nom, prénom, CIN..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Statut"
              >
                {statusChoices.map((choice) => (
                  <MenuItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Type de dossier</InputLabel>
              <Select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                label="Type de dossier"
              >
                {typeChoices.map((choice) => (
                  <MenuItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Tableau des dossiers */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID Dossier</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Succursale</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Montant (HTG)</TableCell>
              <TableCell>Créé par</TableCell>
              <TableCell>Officier</TableCell>
              <TableCell>Date Création</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.map((application) => (
              <TableRow key={application.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {formatToUpperCase(application.application_id)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(application.nom_client)} {formatToUpperCase(application.prenom_client)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(application.succursale_display)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={formatToUpperCase(application.type_dossier_display || application.type_dossier)} 
                    variant="outlined"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={formatToUpperCase(application.statut_display)}
                    color={getStatusColor(application.statut)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Intl.NumberFormat('fr-FR').format(application.montant_genere || 0)}
                </TableCell>
                <TableCell>
                  <Typography style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(application.created_by_name || 'Non spécifié')}
                  </Typography>
                </TableCell>
                <TableCell>
                  {application.officer_name ? (
                    <Typography style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(application.officer_name)}
                    </Typography>
                  ) : (
                    <Chip 
                      label="Non assigné" 
                      color="default" 
                      variant="outlined"
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {application.date_creation_formatee || 
                   new Date(application.date_saisie).toLocaleDateString('fr-FR')}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton
                      onClick={() => navigate(`/applications/${application.id}`)}
                      color="primary"
                      size="small"
                    >
                      <ViewIcon />
                    </IconButton>
                    
                    {canAssignOfficer && !application.officer_credit && (
                      <IconButton
                        onClick={() => handleAssignClick(application)}
                        color="secondary"
                        size="small"
                        title="Assigner un officier"
                      >
                        <AssignmentIcon />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog d'assignation */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)}>
        <DialogTitle>Assigner un officier</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Dossier: <strong style={{ textTransform: 'uppercase' }}>{selectedApplication?.application_id}</strong><br />
            Client: <strong style={{ textTransform: 'uppercase' }}>{selectedApplication?.nom_client} {selectedApplication?.prenom_client}</strong>
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Officier de crédit</InputLabel>
            <Select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              label="Officier de crédit"
            >
              {officers.length > 0 ? (
                officers.map((officer) => (
                  <MenuItem key={officer.id} value={officer.id}>
                    <Typography style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(officer.first_name)} {formatToUpperCase(officer.last_name)} - {formatToUpperCase(officer.branch)}
                    </Typography>
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>Aucun officier disponible</MenuItem>
              )}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(false)}>Annuler</Button>
          <Button 
            onClick={handleAssignOfficer} 
            variant="contained"
            disabled={!selectedOfficer}
          >
            Assigner
          </Button>
        </DialogActions>
      </Dialog>

      {applications.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            Aucun dossier trouvé
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default ApplicationList