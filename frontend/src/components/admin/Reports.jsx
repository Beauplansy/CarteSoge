import React, { useState, useEffect } from 'react'
import { reportAPI, userAPI } from '../../services/api'
import {
  Box, Paper, Typography, Button, Grid, MenuItem,
  TextField, FormControl, InputLabel, Select,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Card, CardContent,
  Alert, CircularProgress
} from '@mui/material'
import {
  PictureAsPdf as PdfIcon,
  TableView as ExcelIcon,
  Assessment as ReportIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

const Reports = () => {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [officers, setOfficers] = useState([])
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    date_debut: null,
    date_fin: null,
    succursale: '',
    type_application: '',
    statut: '',
    officer: ''
  })

  const reportTypes = [
    { value: 'applications_received', label: 'Liste des demandes reçues' },
    { value: 'applications_approved', label: 'Demandes approuvées' },
    { value: 'applications_rejected', label: 'Demandes rejetées' },
    { value: 'applications_pending', label: 'Demandes en attente' },
    { value: 'applications_processed', label: 'Demandes traitées' },
    { value: 'by_branch', label: 'Rapport par succursale' },
    { value: 'by_officer', label: 'Rapport par agent traitant' },
    { value: 'by_type_status', label: 'Rapport par type et statut' }
  ]

  const statutChoices = [
    { value: 'en_attente', label: 'En attente' },
    { value: 'approuve', label: 'Approuvé' },
    { value: 'rejete', label: 'Rejeté' }
  ]

  const typeApplicationChoices = [
    { value: 'pre_approuve', label: 'Pre-Approuvé' },
    { value: 'vente_croisee', label: 'Vente-croisée' },
    { value: 'campagne', label: 'Campagne' }
  ]

  const succursaleChoices = [
    'Aeroport2', 'Direction Général SogeCarte', 'Cap Haïtien', 'Cayes',
    'Conseil d administration SogeCarte', 'Frère', 'Lalue', 'Pétion-ville IV',
    'Pétion-ville 3', 'Rue Pavée', 'Turgeau', 'Autres'
  ]

  useEffect(() => {
    loadOfficers()
  }, [])

  const loadOfficers = async () => {
    try {
      const response = await userAPI.getUsers()
      const officersList = response.data.filter(u => u.role === 'officer' && u.is_active)
      setOfficers(officersList)
    } catch (error) {
      console.error('Error loading officers:', error)
    }
  }

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const generateReport = async () => {
    if (!filters.date_debut || !filters.date_fin) {
      setError('Veuillez sélectionner une période')
      return
    }

    setLoading(true)
    setError('')

    try {
      const reportData = {
        date_debut: filters.date_debut.toISOString().split('T')[0],
        date_fin: filters.date_fin.toISOString().split('T')[0],
        succursale: filters.succursale,
        type_application: filters.type_application,
        statut: filters.statut,
        officer: filters.officer
      }

      const response = await reportAPI.generateReport(reportData)
      setReportData(response.data)
    } catch (error) {
      setError('Erreur lors de la génération du rapport')
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = () => {
    // Implémentation de l'export PDF
    alert('Fonctionnalité PDF à implémenter')
  }

  const exportToExcel = () => {
    // Implémentation de l'export Excel
    alert('Fonctionnalité Excel à implémenter')
  }

  const getStatusColor = (status) => {
    const colors = {
      'en_attente': 'warning',
      'approuve': 'success',
      'rejete': 'error'
    }
    return colors[status] || 'default'
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'HTG'
    }).format(amount)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Génération de Rapports
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Critères du Rapport
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date Début"
                value={filters.date_debut}
                onChange={(date) => handleFilterChange('date_debut', date)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date Fin"
                value={filters.date_fin}
                onChange={(date) => handleFilterChange('date_fin', date)}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Succursale</InputLabel>
                <Select
                  value={filters.succursale}
                  onChange={(e) => handleFilterChange('succursale', e.target.value)}
                  label="Succursale"
                >
                  <MenuItem value="">Toutes</MenuItem>
                  {succursaleChoices.map((branch) => (
                    <MenuItem key={branch} value={branch}>
                      {branch}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type d'application</InputLabel>
                <Select
                  value={filters.type_application}
                  onChange={(e) => handleFilterChange('type_application', e.target.value)}
                  label="Type d'application"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {typeApplicationChoices.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={filters.statut}
                  onChange={(e) => handleFilterChange('statut', e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {statutChoices.map((statut) => (
                    <MenuItem key={statut.value} value={statut.value}>
                      {statut.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Officier de crédit</InputLabel>
                <Select
                  value={filters.officer}
                  onChange={(e) => handleFilterChange('officer', e.target.value)}
                  label="Officier de crédit"
                >
                  <MenuItem value="">Tous</MenuItem>
                  {officers.map((officer) => (
                    <MenuItem key={officer.id} value={officer.id}>
                      {officer.first_name} {officer.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={generateReport}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <ReportIcon />}
                >
                  {loading ? 'Génération...' : 'Générer Rapport'}
                </Button>
                
                {reportData && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      onClick={exportToPDF}
                    >
                      Exporter PDF
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<ExcelIcon />}
                      onClick={exportToExcel}
                    >
                      Exporter Excel
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>

      {reportData && (
        <>
          {/* Statistiques */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Total Dossiers
                  </Typography>
                  <Typography variant="h4">
                    {reportData.statistiques.total}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    En Attente
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {reportData.statistiques.en_attente}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Approuvés
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {reportData.statistiques.approuve}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Montant Total
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(reportData.statistiques.montant_total)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Liste des applications */}
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Succursale</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Montant</TableCell>
                    <TableCell>Date Saisie</TableCell>
                    <TableCell>Officier</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.applications.map((app) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.application_id}</TableCell>
                      <TableCell>
                        {app.nom_client} {app.prenom_client}
                      </TableCell>
                      <TableCell>{app.succursale_display}</TableCell>
                      <TableCell>{app.type_dossier}</TableCell>
                      <TableCell>
                        <Chip 
                          label={app.statut_display}
                          color={getStatusColor(app.statut)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {formatCurrency(app.montant_genere)}
                      </TableCell>
                      <TableCell>
                        {new Date(app.date_saisie).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {app.officer_name || 'Non assigné'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  )
}

export default Reports