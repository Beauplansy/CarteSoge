import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { reportAPI, applicationAPI } from '../../services/api'
import {
  Grid, Card, CardContent, Typography, Box,
  Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button
} from '@mui/material'
import {
  Assignment as AssignmentIcon,
  PendingActions as PendingIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Add as AddIcon,
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  AssignmentTurnedIn as TreatedIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

const StatCard = ({ title, value, icon, color, onClick, subtitle }) => (
  <Card 
    onClick={onClick} 
    sx={{ 
      cursor: onClick ? 'pointer' : 'default', 
      height: '100%',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: onClick ? 'translateY(-4px)' : 'none',
        boxShadow: onClick ? 4 : 1
      }
    }}
  >
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ flex: 1 }}>
          <Typography color="textSecondary" gutterBottom variant="h6" fontSize="0.9rem">
            {title}
          </Typography>
          <Typography variant="h4" component="div" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ color: color, ml: 2 }}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
)

const Dashboard = () => {
  const { user, can } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({})
  const [applicationStats, setApplicationStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    treated: 0
  })
  const [recentApplications, setRecentApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [statsResponse, applicationsResponse] = await Promise.all([
        reportAPI.getDashboardStats(),
        applicationAPI.getApplications({ limit: 10 })
      ])
      
      setStats(statsResponse.data)
      
      // Calculer les statistiques détaillées des applications
      let appsData = applicationsResponse.data;
      if (appsData && appsData.results && Array.isArray(appsData.results)) {
        appsData = appsData.results;
      } else if (appsData && appsData.data && Array.isArray(appsData.data)) {
        appsData = appsData.data;
      }
      
      setRecentApplications(appsData || [])
      
      // Calculer les statistiques détaillées
      calculateApplicationStats(appsData || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateApplicationStats = (applications) => {
    const stats = {
      total: applications.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      treated: 0
    }

    applications.forEach(app => {
      switch (app.statut) {
        case 'en_attente':
          stats.pending++
          break
        case 'approuve':
          stats.approved++
          stats.treated++ // Les approuvés sont considérés comme traités
          break
        case 'rejete':
          stats.rejected++
          stats.treated++ // Les rejetés sont considérés comme traités
          break
        default:
          break
      }
    })

    setApplicationStats(stats)
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Tableau de Bord
        </Typography>
        
        {can('create_application') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/applications/create')}
            size="large"
          >
            Nouveau Dossier
          </Button>
        )}
      </Box>

      {/* Statistiques Générales */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
        Statistiques Générales
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Dossiers"
            value={applicationStats.total || 0}
            icon={<AssignmentIcon sx={{ fontSize: 40 }} />}
            color="#1976d2"
            subtitle="Tous les dossiers"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="En Attente"
            value={applicationStats.pending || 0}
            icon={<PendingIcon sx={{ fontSize: 40 }} />}
            color="#ed6c02"
            subtitle="En cours de traitement"
            onClick={() => navigate('/applications?statut=en_attente')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="30 Derniers Jours"
            value={stats.recent_applications || 0}
            icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
            color="#2e7d32"
            subtitle="Nouveaux dossiers"
          />
        </Grid>
        
        {can('manage_users') && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Utilisateurs Actifs"
              value={stats.total_users || 0}
              icon={<PeopleIcon sx={{ fontSize: 40 }} />}
              color="#9c27b0"
              onClick={() => navigate('/admin/users')}
              subtitle="Personnel actif"
            />
          </Grid>
        )}
      </Grid>

      {/* Statistiques de Traitement */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
        Statistiques de Traitement
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Dossiers Traités"
            value={applicationStats.treated || 0}
            icon={<TreatedIcon sx={{ fontSize: 40 }} />}
            color="#00897b"
            subtitle="Approuvés + Rejetés"
            onClick={() => navigate('/applications?statut=approuve,rejete')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Dossiers Approuvés"
            value={applicationStats.approved || 0}
            icon={<ApprovedIcon sx={{ fontSize: 40 }} />}
            color="#43a047"
            subtitle={`${applicationStats.total > 0 ? Math.round((applicationStats.approved / applicationStats.total) * 100) : 0}% du total`}
            onClick={() => navigate('/applications?statut=approuve')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Dossiers Rejetés"
            value={applicationStats.rejected || 0}
            icon={<RejectedIcon sx={{ fontSize: 40 }} />}
            color="#e53935"
            subtitle={`${applicationStats.total > 0 ? Math.round((applicationStats.rejected / applicationStats.total) * 100) : 0}% du total`}
            onClick={() => navigate('/applications?statut=rejete')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Taux de Traitement"
            value={applicationStats.total > 0 ? `${Math.round((applicationStats.treated / applicationStats.total) * 100)}%` : '0%'}
            icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
            color="#7b1fa2"
            subtitle="Dossiers traités / Total"
          />
        </Grid>
      </Grid>

      {/* Graphique de répartition (simplifié) */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Répartition des Dossiers
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: '#1976d2', borderRadius: 1 }} />
                  <Typography variant="body2">Total: {applicationStats.total}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: '#ed6c02', borderRadius: 1 }} />
                  <Typography variant="body2">En attente: {applicationStats.pending}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: '#43a047', borderRadius: 1 }} />
                  <Typography variant="body2">Approuvés: {applicationStats.approved}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: '#e53935', borderRadius: 1 }} />
                  <Typography variant="body2">Rejetés: {applicationStats.rejected}</Typography>
                </Box>
              </Box>
              
              {/* Barre de progression visuelle */}
              {applicationStats.total > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden' }}>
                    <Box 
                      sx={{ 
                        flex: applicationStats.pending, 
                        backgroundColor: '#ed6c02',
                        transition: 'all 0.3s ease'
                      }} 
                      title={`En attente: ${applicationStats.pending}`}
                    />
                    <Box 
                      sx={{ 
                        flex: applicationStats.approved, 
                        backgroundColor: '#43a047',
                        transition: 'all 0.3s ease'
                      }} 
                      title={`Approuvés: ${applicationStats.approved}`}
                    />
                    <Box 
                      sx={{ 
                        flex: applicationStats.rejected, 
                        backgroundColor: '#e53935',
                        transition: 'all 0.3s ease'
                      }} 
                      title={`Rejetés: ${applicationStats.rejected}`}
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dossiers Récents */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
        Dossiers Récents
      </Typography>
      
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Client</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Succursale</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Statut</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Montant (HTG)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Saisie</TableCell>
              {can('update_application') && <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {recentApplications.map((app) => (
              <TableRow key={app.id} hover>
                <TableCell>
                  <Typography style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {formatToUpperCase(app.application_id)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(app.nom_client)} {formatToUpperCase(app.prenom_client)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(app.succursale_display)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(app.type_dossier_display || app.type_dossier)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={formatToUpperCase(app.statut_display)} 
                    color={getStatusColor(app.statut)}
                    size="small"
                    variant={app.statut === 'en_attente' ? 'outlined' : 'filled'}
                  />
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold">
                    {new Intl.NumberFormat('fr-FR').format(app.montant_genere || 0)} HTG
                  </Typography>
                </TableCell>
                <TableCell>
                  {new Date(app.date_saisie).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </TableCell>
                {can('update_application') && (
                  <TableCell>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => navigate(`/applications/${app.id}`)}
                    >
                      Voir
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {recentApplications.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
          <Typography variant="h6" color="textSecondary">
            Aucun dossier récent
          </Typography>
        </Paper>
      )}

      {loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            Chargement des données...
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default Dashboard