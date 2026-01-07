import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { applicationAPI, userAPI } from '../../services/api'
import {
  Container, Paper, Typography, Button, Grid,
  Box, Chip, Alert, Card, CardContent,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem
} from '@mui/material'
import {
  Edit as EditIcon,
  ArrowBack as BackIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Person as PersonIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { parseISO, isValid } from 'date-fns'

const ApplicationDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, can } = useAuth()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [reevaluateMode, setReevaluateMode] = useState(false)
  const [clientEditMode, setClientEditMode] = useState(false)
  const [assignDialog, setAssignDialog] = useState(false)
  const [officers, setOfficers] = useState([])
  const [selectedOfficer, setSelectedOfficer] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // État SEPARÉ pour le formulaire de traitement
  const [treatmentFormData, setTreatmentFormData] = useState({
    type_carte_final: '',
    raison: '',
    limite_credit_approuve: '',
    date_decision: null,
    commentaire_traitement: '',
    statut: ''
  })

  // État SEPARÉ pour le formulaire client
  const [clientFormData, setClientFormData] = useState({
    nom_client: '',
    prenom_client: '',
    date_naissance: null,
    cin: '',
    adresse_client: '',
    telephone_client: '',
    email_client: '',
    montant_genere: ''
  })

  const formatToUpperCase = (text) => {
    if (!text) return ''
    return typeof text === 'string' ? text.toUpperCase() : text
  }

  const parseDate = (dateString) => {
    if (!dateString) return null
    try {
      const parsed = parseISO(dateString)
      return isValid(parsed) ? parsed : null
    } catch (error) {
      console.error('Erreur parsing date:', dateString, error)
      return null
    }
  }

  const canEdit = can('update_application')
  const canAssign = can('assign_officer')
  const canModifyClient = can('modify_client_info')
  
  const canReevaluate = canEdit && 
    application?.statut && 
    ['approuve', 'rejete'].includes(application.statut) && 
    ['officer', 'manager'].includes(user?.role)

  useEffect(() => {
    loadApplication()
    if (canAssign) {
      loadOfficers()
    }
  }, [id])

  const loadApplication = async () => {
    try {
      const response = await applicationAPI.getApplication(id)
      const appData = response.data
      setApplication(appData)
      
      // Initialiser le formulaire de TRAITEMENT
      setTreatmentFormData({
        type_carte_final: appData.type_carte_final || '',
        raison: appData.raison || '',
        limite_credit_approuve: appData.limite_credit_approuve || '',
        date_decision: parseDate(appData.date_decision),
        commentaire_traitement: appData.commentaire_traitement || '',
        statut: appData.statut || ''
      })

      // Initialiser le formulaire CLIENT
      setClientFormData({
        nom_client: appData.nom_client || '',
        prenom_client: appData.prenom_client || '',
        date_naissance: parseDate(appData.date_naissance),
        cin: appData.cin || '',
        adresse_client: appData.adresse_client || '',
        telephone_client: appData.telephone_client || '',
        email_client: appData.email_client || '',
        montant_genere: appData.montant_genere || ''
      })
    } catch (error) {
      console.error('Erreur chargement dossier:', error)
      setError('Erreur lors du chargement du dossier')
    } finally {
      setLoading(false)
    }
  }

  const loadOfficers = async () => {
    try {
      const response = await userAPI.getUsers()
      let usersData = response.data;
      
      if (usersData && usersData.results && Array.isArray(usersData.results)) {
        usersData = usersData.results;
      } else if (usersData && usersData.data && Array.isArray(usersData.data)) {
        usersData = usersData.data;
      } else if (!Array.isArray(usersData)) {
        usersData = [];
      }
      
      const officersList = usersData.filter(u => u.role === 'officer' && u.is_active)
      setOfficers(officersList)
    } catch (error) {
      console.error('Error loading officers:', error)
      setOfficers([])
    }
  }

  const validateTreatmentField = (name, value) => {
    const errors = { ...fieldErrors }
    
    switch (name) {
      case 'limite_credit_approuve':
        if (value && parseFloat(value) < 1000) {
          errors[name] = 'La limite de crédit minimum est de 1,000 HTG'
        } else {
          delete errors[name]
        }
        break
        
      case 'date_decision':
        if (value && value > new Date()) {
          errors[name] = 'La date de décision ne peut pas être dans le futur'
        } else {
          delete errors[name]
        }
        break
        
      default:
        break
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleTreatmentFormChange = (name, value) => {
    setTreatmentFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    validateTreatmentField(name, value)
  }

  const handleClientFormChange = (name, value) => {
    let processedValue = value
    
    // Conversion automatique en majuscules (sauf email)
    if (name !== 'email_client' && typeof value === 'string') {
      processedValue = value.toUpperCase()
    }
    
    setClientFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
  }

  const handleSaveTreatment = async () => {
    const finalErrors = {}
    
    if (treatmentFormData.limite_credit_approuve && parseFloat(treatmentFormData.limite_credit_approuve) < 1000) {
      finalErrors.limite_credit_approuve = 'La limite de crédit minimum est de 1,000 HTG'
    }
    
    if (treatmentFormData.date_decision && treatmentFormData.date_decision > new Date()) {
      finalErrors.date_decision = 'La date de décision ne peut pas être dans le futur'
    }
    
    if (Object.keys(finalErrors).length > 0) {
      setFieldErrors(finalErrors)
      return
    }

    try {
      const updateData = {
        type_carte_final: treatmentFormData.type_carte_final,
        raison: treatmentFormData.raison,
        date_decision: treatmentFormData.date_decision ? treatmentFormData.date_decision.toISOString().split('T')[0] : null,
        commentaire_traitement: treatmentFormData.commentaire_traitement,
        statut: treatmentFormData.statut,
        limite_credit_approuve: treatmentFormData.limite_credit_approuve ? parseFloat(treatmentFormData.limite_credit_approuve) : null
      }

      console.log('📤 Données traitement envoyées:', updateData)

      await applicationAPI.updateApplication(id, updateData)
      setSuccess(reevaluateMode ? 'Dossier réévalué avec succès' : 'Dossier mis à jour avec succès')
      setEditMode(false)
      setReevaluateMode(false)
      loadApplication()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('❌ Erreur sauvegarde traitement:', error)
      const errorMessage = error.response?.data 
        ? Object.values(error.response.data).flat().join(', ')
        : 'Erreur lors de la mise à jour du dossier'
      setError(errorMessage)
    }
  }

  const handleSaveClientInfo = async () => {
    try {
      const updateData = {
        ...clientFormData,
        date_naissance: clientFormData.date_naissance ? 
          clientFormData.date_naissance.toISOString().split('T')[0] : null,
        montant_genere: clientFormData.montant_genere ? 
          parseFloat(clientFormData.montant_genere) : null
      }

      console.log('📤 Données client envoyées:', updateData)

      await applicationAPI.updateApplication(id, updateData)
      setSuccess('Informations client mises à jour avec succès')
      setClientEditMode(false)
      loadApplication()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      console.error('❌ Erreur sauvegarde infos client:', error)
      const errorMessage = error.response?.data 
        ? Object.values(error.response.data).flat().join(', ')
        : 'Erreur lors de la mise à jour des informations client'
      setError(errorMessage)
    }
  }

  const handleAssignOfficer = async () => {
    try {
      await applicationAPI.assignOfficer(id, { officer_id: parseInt(selectedOfficer) })
      setSuccess('Officier assigné avec succès')
      setAssignDialog(false)
      loadApplication()
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Erreur lors de l\'assignation: ' + (error.response?.data?.error || error.message))
    }
  }

  const handleReevaluate = () => {
    setReevaluateMode(true)
    setEditMode(true)
  }

  const handleEditTreatment = () => {
    setReevaluateMode(false)
    setEditMode(true)
  }

  const handleEditClient = () => {
    setClientEditMode(true)
  }

  const cancelEdit = () => {
    setReevaluateMode(false)
    setEditMode(false)
    setClientEditMode(false)
    loadApplication() // Recharge les données originales
  }

  const getStatusColor = (status) => {
    const colors = {
      'en_attente': 'warning',
      'approuve': 'success',
      'rejete': 'error'
    }
    return colors[status] || 'default'
  }

  const typeCarteFinalChoices = [
    { value: 'master_gold', label: 'MASTER CARD GOLD' },
    { value: 'master_gold_aa', label: 'MASTER CARD GOLD AA' },
    { value: 'master_intl', label: 'MASTER CARD INT\'L' },
    { value: 'master_local', label: 'MASTER CARD LOCAL' },
    { value: 'master_black', label: 'MASTER CARD BLACK' },
    { value: 'visa_business', label: 'VISA BUSINESS' },
    { value: 'visa_gold', label: 'VISA GOLD' },
    { value: 'visa_intl', label: 'VISA INT\'L' },
    { value: 'visa_local', label: 'VISA LOCAL' },
    { value: 'visa_platinum', label: 'VISA PLATINUM' }
  ]

  const raisonChoices = [
    { value: 'gage_demande', label: 'GAGE DEMANDE' },
    { value: 'application_signee', label: 'APPLICATION SIGNEE' },
    { value: 'client_introuvable', label: 'CLIENT INTROUVABLE' },
    { value: 'employeur_impossible', label: 'EMPLOYEUR IMPOSSIBLE A TROUVER' },
    { value: 'pieces_manquante', label: 'PIECES MANQUANTE' }
  ]

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography>Chargement...</Typography>
      </Container>
    )
  }

  if (!application) {
    return (
      <Container maxWidth="lg">
        <Typography>Dossier non trouvé</Typography>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/applications')}
          sx={{ mb: 2 }}
        >
          Retour à la liste
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4">
            Dossier {application.application_id}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canAssign && !application.officer_credit && (
              <Button
                startIcon={<AssignmentIcon />}
                onClick={() => setAssignDialog(true)}
                variant="outlined"
              >
                Assigner un officier
              </Button>
            )}

            {canAssign && application.officer_credit && user?.role === 'manager' && (
              <Button
                startIcon={<AssignmentIcon />}
                onClick={() => {
                  setSelectedOfficer(application.officer_credit.id)
                  setAssignDialog(true)
                }}
                variant="outlined"
                color="warning"
              >
                Réaffecter officier
              </Button>
            )}
            
            {canModifyClient && !clientEditMode && (
              <Button
                startIcon={<PersonIcon />}
                onClick={handleEditClient}
                variant="contained"
                color="primary"
              >
                Modifier infos client
              </Button>
            )}
            
            {canReevaluate && !editMode && (
              <Button
                startIcon={<AssessmentIcon />}
                onClick={handleReevaluate}
                variant="contained"
                color="secondary"
              >
                Réévaluer
              </Button>
            )}
            
            {canEdit && !editMode && !reevaluateMode && (
              <Button
                startIcon={<EditIcon />}
                onClick={handleEditTreatment}
                variant="contained"
              >
                Modifier traitement
              </Button>
            )}
            
            {(editMode || reevaluateMode || clientEditMode) && (
              <Button
                onClick={cancelEdit}
                variant="outlined"
              >
                Annuler
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Informations de base */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informations de Base
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Date de création:
                  </Typography>
                  <Typography variant="body1">
                    {application.date_creation_formatee || 
                      new Date(application.date_saisie).toLocaleDateString('fr-FR', {
                       year: 'numeric',
                       month: 'long',
                       day: 'numeric',
                       hour: '2-digit',
                       minute: '2-digit'
                     })}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Statut:
                  </Typography>
                  <Chip 
                    label={formatToUpperCase(application.statut_display)}
                    color={getStatusColor(application.statut)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Type de dossier:
                  </Typography>
                  <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(application.type_dossier_display || application.type_dossier)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Succursale:
                  </Typography>
                  <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(application.succursale_display)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Numéro succursale:
                  </Typography>
                  <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(application.no_succursale)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Créé par:
                  </Typography>
                  <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(application.created_by_name)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Officier assigné:
                  </Typography>
                  <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(application.officer_name || 'Non assigné')}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="textSecondary">
                    Montant généré:
                  </Typography>
                  <Typography variant="body1">
                    {new Intl.NumberFormat('fr-FR').format(application.montant_genere || 0)} HTG
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Informations client */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Informations Client
                </Typography>
                {canModifyClient && !clientEditMode && (
                  <Button
                    startIcon={<EditIcon />}
                    onClick={handleEditClient}
                    size="small"
                  >
                    Modifier
                  </Button>
                )}
              </Box>
              
              {!clientEditMode ? (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Nom:
                    </Typography>
                    <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(application.nom_client)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Prénom:
                    </Typography>
                    <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(application.prenom_client)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Date de naissance:
                    </Typography>
                    <Typography variant="body1">
                      {new Date(application.date_naissance).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      CIN/NIF:
                    </Typography>
                    <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(application.cin)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="textSecondary">
                      Adresse:
                    </Typography>
                    <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(application.adresse_client || 'Non renseignée')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Téléphone:
                    </Typography>
                    <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                      {formatToUpperCase(application.telephone_client || 'Non renseigné')}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Email:
                    </Typography>
                    <Typography variant="body1">
                      {application.email_client || 'Non renseigné'}
                    </Typography>
                  </Grid>
                </Grid>
              ) : (
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Nom Client"
                        value={clientFormData.nom_client}
                        onChange={(e) => handleClientFormChange('nom_client', e.target.value)}
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Prénom Client"
                        value={clientFormData.prenom_client}
                        onChange={(e) => handleClientFormChange('prenom_client', e.target.value)}
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <DatePicker
                        label="Date de Naissance"
                        value={clientFormData.date_naissance}
                        onChange={(date) => handleClientFormChange('date_naissance', date)}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                          }
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="CIN/NIF/Passeport"
                        value={clientFormData.cin}
                        onChange={(e) => handleClientFormChange('cin', e.target.value)}
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Adresse Client"
                        value={clientFormData.adresse_client}
                        onChange={(e) => handleClientFormChange('adresse_client', e.target.value)}
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Téléphone Client"
                        value={clientFormData.telephone_client}
                        onChange={(e) => handleClientFormChange('telephone_client', e.target.value)}
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Email Client"
                        type="email"
                        value={clientFormData.email_client}
                        onChange={(e) => handleClientFormChange('email_client', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Montant Généré (HTG)"
                        type="number"
                        value={clientFormData.montant_genere}
                        onChange={(e) => handleClientFormChange('montant_genere', e.target.value)}
                        InputProps={{ inputProps: { min: 1000, step: 0.01 } }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          variant="contained"
                          onClick={handleSaveClientInfo}
                        >
                          Sauvegarder
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={cancelEdit}
                        >
                          Annuler
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </LocalizationProvider>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Informations de traitement (lecture seule) */}
        {!editMode && !reevaluateMode && (application.type_carte_final || application.limite_credit_approuve || application.raison || application.commentaire_traitement) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations de Traitement
                </Typography>
                
                <Grid container spacing={2}>
                  {application.type_carte_final && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Type de carte:
                      </Typography>
                      <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                        {formatToUpperCase(typeCarteFinalChoices.find(t => t.value === application.type_carte_final)?.label || application.type_carte_final)}
                      </Typography>
                    </Grid>
                  )}
                  {application.raison && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Raison:
                      </Typography>
                      <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                        {formatToUpperCase(raisonChoices.find(r => r.value === application.raison)?.label || application.raison)}
                      </Typography>
                    </Grid>
                  )}
                  {application.limite_credit_approuve && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Limite approuvée:
                      </Typography>
                      <Typography variant="body1">
                        {new Intl.NumberFormat('fr-FR').format(application.limite_credit_approuve)} HTG
                      </Typography>
                    </Grid>
                  )}
                  {application.date_decision && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        Date décision:
                      </Typography>
                      <Typography variant="body1">
                        {new Date(application.date_decision).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Grid>
                  )}
                  {application.commentaire_traitement && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary">
                        Commentaire:
                      </Typography>
                      <Typography variant="body1" style={{ textTransform: 'uppercase' }}>
                        {formatToUpperCase(application.commentaire_traitement)}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* FORMULAIRE DE MODIFICATION/RÉÉVALUATION DU TRAITEMENT */}
        {(editMode || reevaluateMode) && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {reevaluateMode ? 'Réévaluation du Dossier' : 'Modification du Traitement'}
                </Typography>
                
                {reevaluateMode && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>Réévaluation en cours</strong> - Vous pouvez modifier les décisions précédentes
                  </Alert>
                )}

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Type de carte final</InputLabel>
                        <Select
                          value={treatmentFormData.type_carte_final}
                          onChange={(e) => handleTreatmentFormChange('type_carte_final', e.target.value)}
                          label="Type de carte final"
                        >
                          {typeCarteFinalChoices.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Raison</InputLabel>
                        <Select
                          value={treatmentFormData.raison}
                          onChange={(e) => handleTreatmentFormChange('raison', e.target.value)}
                          label="Raison"
                        >
                          {raisonChoices.map((raison) => (
                            <MenuItem key={raison.value} value={raison.value}>
                              {raison.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Limite de crédit approuvée (HTG)"
                        type="number"
                        value={treatmentFormData.limite_credit_approuve}
                        onChange={(e) => handleTreatmentFormChange('limite_credit_approuve', e.target.value)}
                        error={!!fieldErrors.limite_credit_approuve}
                        helperText={fieldErrors.limite_credit_approuve || 'Minimum 1,000 HTG'}
                        InputProps={{ inputProps: { min: 1000, step: 0.01 } }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <DatePicker
                        label="Date de décision"
                        value={treatmentFormData.date_decision}
                        onChange={(date) => handleTreatmentFormChange('date_decision', date)}
                        maxDate={new Date()}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            error: !!fieldErrors.date_decision,
                            helperText: fieldErrors.date_decision || 'Ne peut pas être dans le futur'
                          }
                        }}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Statut</InputLabel>
                        <Select
                          value={treatmentFormData.statut}
                          onChange={(e) => handleTreatmentFormChange('statut', e.target.value)}
                          label="Statut"
                        >
                          <MenuItem value="en_attente">En attente</MenuItem>
                          <MenuItem value="approuve">Approuvé</MenuItem>
                          <MenuItem value="rejete">Rejeté</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Commentaire de traitement"
                        value={treatmentFormData.commentaire_traitement}
                        onChange={(e) => handleTreatmentFormChange('commentaire_traitement', e.target.value)}
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                          variant="contained" 
                          onClick={handleSaveTreatment}
                          disabled={Object.keys(fieldErrors).length > 0}
                        >
                          {reevaluateMode ? 'Sauvegarder la réévaluation' : 'Sauvegarder les modifications'}
                        </Button>
                        <Button 
                          variant="outlined" 
                          onClick={cancelEdit}
                        >
                          Annuler
                        </Button>
                      </Box>
                    </Grid>
                  </Grid>
                </LocalizationProvider>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Dialog d'assignation/Réaffectation */}
      <Dialog open={assignDialog} onClose={() => setAssignDialog(false)}>
        <DialogTitle>
          {application?.officer_credit ? 'Réaffecter un officier' : 'Assigner un officier'}
        </DialogTitle>
        <DialogContent>
          {application?.officer_credit && (
            <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" color="textSecondary">
                Officier actuel :
              </Typography>
              <Typography variant="body2" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                {application.officer_credit.first_name} {application.officer_credit.last_name}
              </Typography>
            </Box>
          )}
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Officier de crédit</InputLabel>
            <Select
              value={selectedOfficer}
              onChange={(e) => setSelectedOfficer(e.target.value)}
              label="Officier de crédit"
            >
              {officers.map((officer) => (
                <MenuItem key={officer.id} value={officer.id}>
                  <Typography style={{ textTransform: 'uppercase' }}>
                    {formatToUpperCase(officer.first_name)} {formatToUpperCase(officer.last_name)} - {formatToUpperCase(officer.branch)}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAssignDialog(false)
            setSelectedOfficer('')
          }}>
            Annuler
          </Button>
          <Button 
            onClick={handleAssignOfficer} 
            variant="contained"
            disabled={!selectedOfficer}
          >
            {application?.officer_credit ? 'Réaffecter' : 'Assigner'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default ApplicationDetail