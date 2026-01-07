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
  AssignmentTurnedIn as TreatedIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

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

  // Fonction pour obtenir le nom complet
  const getFullName = () => {
    if (!user) return ''
    const firstName = user.first_name || ''
    const lastName = user.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim()
    return fullName || user.username || user.email || 'Utilisateur'
  }

  // Fonction pour obtenir l'heure de la journée
  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Bonjour'
    if (hour < 18) return 'Bon après-midi'
    return 'Bonsoir'
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [statsResponse, applicationsResponse] = await Promise.all([
        reportAPI.getDashboardStats(),
        applicationAPI.getApplications({ limit: 10 })
      ])
      
      setStats(statsResponse.data || {})
      
      // Gérer la structure de réponse des applications
      let appsData = applicationsResponse.data;
      if (appsData && appsData.results && Array.isArray(appsData.results)) {
        appsData = appsData.results;
      } else if (appsData && appsData.data && Array.isArray(appsData.data)) {
        appsData = appsData.data;
      } else if (Array.isArray(appsData)) {
        appsData = appsData;
      } else {
        appsData = [];
      }
      
      setRecentApplications(appsData)
      calculateApplicationStats(appsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setRecentApplications([])
      setApplicationStats({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        treated: 0
      })
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
          stats.treated++
          break
        case 'rejete':
          stats.rejected++
          stats.treated++
          break
        default:
          stats.pending++
          break
      }
    })

    setApplicationStats(stats)
  }

  // Données pour le graphique circulaire
  const pieChartData = [
    { name: 'En Attente', value: applicationStats.pending, color: '#ed6c02' },
    { name: 'Approuvés', value: applicationStats.approved, color: '#43a047' },
    { name: 'Rejetés', value: applicationStats.rejected, color: '#e53935' }
  ].filter(item => item.value > 0)

  // Données pour le graphique en barres
  const barChartData = [
    { name: 'Total', value: applicationStats.total, color: '#1976d2' },
    { name: 'En Attente', value: applicationStats.pending, color: '#ed6c02' },
    { name: 'Approuvés', value: applicationStats.approved, color: '#43a047' },
    { name: 'Rejetés', value: applicationStats.rejected, color: '#e53935' },
    { name: 'Traités', value: applicationStats.treated, color: '#00897b' }
  ]

  // Calcul des pourcentages pour l'affichage
  const approvalRate = applicationStats.total > 0 ? Math.round((applicationStats.approved / applicationStats.total) * 100) : 0
  const rejectionRate = applicationStats.total > 0 ? Math.round((applicationStats.rejected / applicationStats.total) * 100) : 0
  const treatmentRate = applicationStats.total > 0 ? Math.round((applicationStats.treated / applicationStats.total) * 100) : 0
  const pendingRate = applicationStats.total > 0 ? Math.round((applicationStats.pending / applicationStats.total) * 100) : 0

  // Données pour le graphique de performance
  const performanceData = [
    { name: 'Taux Traitement', value: treatmentRate },
    { name: 'Taux Approbation', value: approvalRate },
    { name: 'Taux Rejet', value: rejectionRate }
  ]

  const getStatusColor = (status) => {
    const colors = {
      'en_attente': 'warning',
      'approuve': 'success',
      'rejete': 'error'
    }
    return colors[status] || 'default'
  }

  const getStatusDisplay = (status) => {
    const statusMap = {
      'en_attente': 'En Attente',
      'approuve': 'Approuvé',
      'rejete': 'Rejeté'
    }
    return statusMap[status] || status
  }

  const formatToUpperCase = (text) => {
    if (!text) return ''
    return typeof text === 'string' ? text.toUpperCase() : String(text)
  }

  // Composant pour le label du graphique circulaire
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent === 0) return null
    
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  return (
    <Box>
      {/* Titre de bienvenue simple */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 1, color: 'primary.main' }}>
          {getTimeOfDayGreeting()}, {getFullName()}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bienvenue dans votre tableau de bord de gestion des crédits
        </Typography>
      </Box>

      {/* Bouton Nouveau Dossier */}
      {can('create_application') && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/applications/create')}
            size="large"
          >
            Nouveau Dossier
          </Button>
        </Box>
      )}

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
            subtitle={`${pendingRate}% du total`}
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

      {/* GRAPHIQUES VISUELS */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
        Visualisation des Données
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {/* Graphique Circulaire - Répartition */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PieChartIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Répartition des Dossiers
                </Typography>
              </Box>
              
              {applicationStats.total > 0 && pieChartData.length > 0 ? (
                <Box>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} dossiers`, 'Quantité']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                    {pieChartData.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1, mx: 1 }}>
                        <Box sx={{ width: 12, height: 12, backgroundColor: item.color, borderRadius: 1, mr: 1 }} />
                        <Typography variant="body2">
                          {item.name}: {item.value} ({Math.round((item.value / applicationStats.total) * 100)}%)
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <Typography color="textSecondary" variant="h6" gutterBottom>
                    Aucune donnée disponible
                  </Typography>
                  <Typography color="textSecondary" variant="body2">
                    Aucun dossier à afficher dans le graphique
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Graphique en Barres - Comparaison */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Comparaison des Statuts
                </Typography>
              </Box>
              
              {applicationStats.total > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} dossiers`, 'Quantité']} />
                    <Legend />
                    <Bar dataKey="value" name="Nombre de dossiers">
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <Typography color="textSecondary" variant="h6" gutterBottom>
                    Aucune donnée disponible
                  </Typography>
                  <Typography color="textSecondary" variant="body2">
                    Aucun dossier à afficher dans le graphique
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Graphique de Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Indicateurs de Performance
              </Typography>
              
              {applicationStats.total > 0 ? (
                <Box>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Pourcentage']} />
                      <Bar dataKey="value" name="Pourcentage" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                  
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                        <Typography variant="h4" fontWeight="bold" color="white">
                          {treatmentRate}%
                        </Typography>
                        <Typography variant="body2" color="white">
                          Taux de Traitement
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                        <Typography variant="h4" fontWeight="bold" color="white">
                          {approvalRate}%
                        </Typography>
                        <Typography variant="body2" color="white">
                          Taux d'Approbation
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                        <Typography variant="h4" fontWeight="bold" color="white">
                          {rejectionRate}%
                        </Typography>
                        <Typography variant="body2" color="white">
                          Taux de Rejet
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  <Typography color="textSecondary" variant="h6" gutterBottom>
                    Aucune donnée disponible
                  </Typography>
                  <Typography color="textSecondary" variant="body2">
                    Aucun dossier pour calculer les performances
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
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
            subtitle={`${treatmentRate}% du total`}
            onClick={() => navigate('/applications?statut=approuve,rejete')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Dossiers Approuvés"
            value={applicationStats.approved || 0}
            icon={<ApprovedIcon sx={{ fontSize: 40 }} />}
            color="#43a047"
            subtitle={`${approvalRate}% du total`}
            onClick={() => navigate('/applications?statut=approuve')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Dossiers Rejetés"
            value={applicationStats.rejected || 0}
            icon={<RejectedIcon sx={{ fontSize: 40 }} />}
            color="#e53935"
            subtitle={`${rejectionRate}% du total`}
            onClick={() => navigate('/applications?statut=rejete')}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Taux de Traitement"
            value={`${treatmentRate}%`}
            icon={<TrendingUpIcon sx={{ fontSize: 40 }} />}
            color="#7b1fa2"
            subtitle="Dossiers traités / Total"
          />
        </Grid>
      </Grid>

      {/* Dossiers Récents */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
        Dossiers Récents
      </Typography>
      
      {recentApplications.length > 0 ? (
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
                      {formatToUpperCase(app.application_id || app.id)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(app.nom_client)} {formatToUpperCase(app.prenom_client)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(app.succursale_display || app.succursale)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(app.type_dossier_display || app.type_dossier)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusDisplay(app.statut)} 
                      color={getStatusColor(app.statut)}
                      size="small"
                      variant={app.statut === 'en_attente' ? 'outlined' : 'filled'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">
                      {new Intl.NumberFormat('fr-FR').format(app.montant_genere || app.montant || 0)} HTG
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {app.date_saisie ? new Date(app.date_saisie).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : 'N/A'}
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
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 2 }}>
          <Typography variant="h6" color="textSecondary">
            {loading ? 'Chargement des données...' : 'Aucun dossier récent'}
          </Typography>
        </Paper>
      )}
    </Box>
  )
}

export default Dashboard