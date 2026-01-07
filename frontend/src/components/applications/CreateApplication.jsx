import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { applicationAPI, userAPI } from '../../services/api'
import {
  Container, Paper, TextField, Button, Typography,
  Box, Grid, MenuItem, Alert, FormControl, InputLabel,
  Select, FormHelperText
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

const CreateApplication = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [officers, setOfficers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const [formData, setFormData] = useState({
    nom_off_groupe: '',
    prenom_off_groupe: '',
    succursale: '',
    no_succursale: '',
    autre_succursale: '',
    nom_client: '',
    prenom_client: '',
    date_naissance: null,
    cin: '',
    adresse_client: '',
    telephone_client: '',
    email_client: '',
    type_dossier: '',
    type_campagne: '',
    date_debut_campagne: null,
    date_fin_campagne: null,
    type_carte_application: '',
    officer_credit: '',
    montant_genere: '',
    commentaire: ''
  })

  useEffect(() => {
    if (user?.role === 'secretary' || user?.role === 'manager') {
      loadOfficers()
    }
  }, [user])

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

  const validateField = (name, value) => {
    const errors = { ...fieldErrors }
    
    switch (name) {
      case 'montant_genere':
        if (value && parseFloat(value) < 1000) {
          errors[name] = 'Le montant minimum est de 1,000 HTG'
        } else {
          delete errors[name]
        }
        break
        
      case 'date_naissance':
        if (value) {
          const birthDate = new Date(value)
          const minDate = new Date()
          minDate.setFullYear(minDate.getFullYear() - 10)
          if (birthDate > minDate) {
            errors[name] = 'Le client doit avoir au moins 10 ans'
          } else {
            delete errors[name]
          }
        }
        break
        
      case 'email_client':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors[name] = 'Format d\'email invalide'
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

  const handleChange = (e) => {
    const { name, value } = e.target
    let processedValue = value
    
    // Liste EXPLICITE des champs à convertir en majuscules
    const upperCaseFields = [
      'nom_off_groupe',
      'prenom_off_groupe', 
      'no_succursale',
      'autre_succursale',
      'nom_client',
      'prenom_client',
      'cin',
      'adresse_client',
      'telephone_client',
      'commentaire',
      'type_campagne'
    ]
    
    // Conversion automatique en majuscules seulement pour les champs spécifiés
    if (upperCaseFields.includes(name) && typeof value === 'string') {
      processedValue = value.toUpperCase()
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }))
    
    validateField(name, processedValue)
  }

  const handleDateChange = (name, date) => {
    setFormData(prev => ({
      ...prev,
      [name]: date
    }))
    
    if (date) {
      validateField(name, date)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation finale avant soumission
    const finalErrors = {}
    
    if (!formData.montant_genere || parseFloat(formData.montant_genere) < 1000) {
      finalErrors.montant_genere = 'Le montant minimum est de 1,000 HTG'
    }
    
    if (!formData.date_naissance) {
      finalErrors.date_naissance = 'La date de naissance est requise'
    } else {
      const birthDate = new Date(formData.date_naissance)
      const minDate = new Date()
      minDate.setFullYear(minDate.getFullYear() - 10)
      if (birthDate > minDate) {
        finalErrors.date_naissance = 'Le client doit avoir au moins 10 ans'
      }
    }

    // Validation des champs Select requis
    if (!formData.type_dossier) {
      finalErrors.type_dossier = 'Le type de dossier est requis'
    }
    
    if (!formData.type_carte_application) {
      finalErrors.type_carte_application = 'Le type de carte est requis'
    }
    
    if (!formData.succursale) {
      finalErrors.succursale = 'La succursale est requise'
    }

    // Validation pour les campagnes
    if (formData.type_dossier === 'campagne' && !formData.type_campagne) {
      finalErrors.type_campagne = 'Le type de campagne est requis'
    }
    
    if (Object.keys(finalErrors).length > 0) {
      setFieldErrors(finalErrors)
      setLoading(false)
      return
    }

    try {
      const submitData = {
        ...formData,
        date_naissance: formData.date_naissance ? formData.date_naissance.toISOString().split('T')[0] : null,
        date_debut_campagne: formData.date_debut_campagne ? formData.date_debut_campagne.toISOString().split('T')[0] : null,
        date_fin_campagne: formData.date_fin_campagne ? formData.date_fin_campagne.toISOString().split('T')[0] : null,
        montant_genere: parseFloat(formData.montant_genere) || 0
      }

      console.log('📤 Données envoyées:', submitData)

      await applicationAPI.createApplication(submitData)
      setSuccess('Dossier créé avec succès!')
      
      setTimeout(() => {
        navigate('/applications')
      }, 2000)
    } catch (error) {
      const errorMessage = error.response?.data 
        ? Object.values(error.response.data).flat().join(', ')
        : 'Erreur lors de la création du dossier'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const succursaleChoices = [
    { value: 'aeroport2', label: 'Aeroport2' },
    { value: 'direction_generale', label: 'Direction Général SogeCarte' },
    { value: 'cap_haitien', label: 'Cap Haïtien' },
    { value: 'cayes', label: 'Cayes' },
    { value: 'conseil_administration', label: 'Conseil d administration SogeCarte' },
    { value: 'frere', label: 'Frère' },
    { value: 'lalue', label: 'Lalue' },
    { value: 'petion_ville_iv', label: 'Pétion-ville IV' },
    { value: 'petion_ville_3', label: 'Pétion-ville 3' },
    { value: 'rue_pavee', label: 'Rue Pavée' },
    { value: 'turgeau', label: 'Turgeau' },
    { value: 'autres', label: 'Autres' },
  ]

  const typeDossierChoices = [
    { value: 'pre_approuve', label: 'Pre-Approuvé' },
    { value: 'vente_croisee', label: 'Vente-croisée' },
    { value: 'campagne', label: 'Campagne' },
  ]

  const typeCarteChoices = [
    { value: 'credit', label: 'Carte de crédit' },
    { value: 'sogephone', label: 'SogePhone' },
    { value: 'tele_haiti', label: 'Télé Haïti' },
    { value: 'digicel', label: 'Digicel' },
    { value: 'american', label: 'American' },
  ]

  return (
    <Container maxWidth="lg">
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Nouveau Dossier de Crédit
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box component="form" onSubmit={handleSubmit}>
            {/* Informations du Groupe */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Informations du Groupe
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Nom Officier Groupe"
                  name="nom_off_groupe"
                  value={formData.nom_off_groupe}
                  onChange={handleChange}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Prénom Officier Groupe"
                  name="prenom_off_groupe"
                  value={formData.prenom_off_groupe}
                  onChange={handleChange}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
            </Grid>

            {/* Succursale */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Succursale
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!fieldErrors.succursale}>
                  <InputLabel>Succursale/Filiale</InputLabel>
                  <Select
                    name="succursale"
                    value={formData.succursale}
                    onChange={handleChange}
                    label="Succursale/Filiale"
                  >
                    {succursaleChoices.map((choice) => (
                      <MenuItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.succursale && (
                    <FormHelperText error>{fieldErrors.succursale}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Numéro Succursale"
                  name="no_succursale"
                  value={formData.no_succursale}
                  onChange={handleChange}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              {formData.succursale === 'autres' && (
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Autre Succursale"
                    name="autre_succursale"
                    value={formData.autre_succursale}
                    onChange={handleChange}
                    inputProps={{ style: { textTransform: 'uppercase' } }}
                  />
                </Grid>
              )}
            </Grid>

            {/* Informations Client */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Informations Client
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Nom Client"
                  name="nom_client"
                  value={formData.nom_client}
                  onChange={handleChange}
                  error={!!fieldErrors.nom_client}
                  helperText={fieldErrors.nom_client}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Prénom Client"
                  name="prenom_client"
                  value={formData.prenom_client}
                  onChange={handleChange}
                  error={!!fieldErrors.prenom_client}
                  helperText={fieldErrors.prenom_client}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date de Naissance *"
                  value={formData.date_naissance}
                  onChange={(date) => handleDateChange('date_naissance', date)}
                  maxDate={new Date(new Date().setFullYear(new Date().getFullYear() - 10))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!fieldErrors.date_naissance,
                      helperText: fieldErrors.date_naissance || 'Le client doit avoir au moins 10 ans'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="CIN/NIF/Passeport"
                  name="cin"
                  value={formData.cin}
                  onChange={handleChange}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Adresse Client"
                  name="adresse_client"
                  value={formData.adresse_client}
                  onChange={handleChange}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Téléphone Client"
                  name="telephone_client"
                  value={formData.telephone_client}
                  onChange={handleChange}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email Client"
                  name="email_client"
                  type="email"
                  value={formData.email_client}
                  onChange={handleChange}
                  error={!!fieldErrors.email_client}
                  helperText={fieldErrors.email_client}
                />
              </Grid>
            </Grid>

            {/* Type de Dossier */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Type de Dossier
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!fieldErrors.type_dossier}>
                  <InputLabel>Type de Dossier</InputLabel>
                  <Select
                    name="type_dossier"
                    value={formData.type_dossier}
                    onChange={handleChange}
                    label="Type de Dossier"
                  >
                    {typeDossierChoices.map((choice) => (
                      <MenuItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.type_dossier && (
                    <FormHelperText error>{fieldErrors.type_dossier}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required error={!!fieldErrors.type_carte_application}>
                  <InputLabel>Type de Carte</InputLabel>
                  <Select
                    name="type_carte_application"
                    value={formData.type_carte_application}
                    onChange={handleChange}
                    label="Type de Carte"
                  >
                    {typeCarteChoices.map((choice) => (
                      <MenuItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.type_carte_application && (
                    <FormHelperText error>{fieldErrors.type_carte_application}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
              
              {formData.type_dossier === 'campagne' && (
                <>
                  <Grid item xs={12}>
                    <TextField
                      required
                      fullWidth
                      label="Type de Campagne"
                      name="type_campagne"
                      value={formData.type_campagne}
                      onChange={handleChange}
                      error={!!fieldErrors.type_campagne}
                      helperText={fieldErrors.type_campagne}
                      inputProps={{ style: { textTransform: 'uppercase' } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date Début Campagne"
                      value={formData.date_debut_campagne}
                      onChange={(date) => handleDateChange('date_debut_campagne', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                        }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <DatePicker
                      label="Date Fin Campagne"
                      value={formData.date_fin_campagne}
                      onChange={(date) => handleDateChange('date_fin_campagne', date)}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          required: true,
                        }
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>

            {/* Assignation et Montant */}
            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Assignation et Montant
            </Typography>
            <Grid container spacing={3}>
              {user?.role === 'secretary' && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Officier de Crédit</InputLabel>
                    <Select
                      name="officer_credit"
                      value={formData.officer_credit}
                      onChange={handleChange}
                      label="Officier de Crédit"
                    >
                      {officers.length > 0 ? (
                        officers.map((officer) => (
                          <MenuItem key={officer.id} value={officer.id}>
                            {officer.first_name} {officer.last_name}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem disabled>Aucun officier disponible</MenuItem>
                      )}
                    </Select>
                    <FormHelperText>Optionnel - peut être assigné plus tard</FormHelperText>
                  </FormControl>
                </Grid>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Montant Généré (HTG) *"
                  name="montant_genere"
                  type="number"
                  value={formData.montant_genere}
                  onChange={handleChange}
                  error={!!fieldErrors.montant_genere}
                  helperText={fieldErrors.montant_genere || 'Minimum 1,000 HTG'}
                  InputProps={{ inputProps: { min: 1000, step: 0.01 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Commentaire"
                  name="commentaire"
                  value={formData.commentaire}
                  onChange={handleChange}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading || Object.keys(fieldErrors).length > 0}
                sx={{ minWidth: 120 }}
              >
                {loading ? 'Création...' : 'Créer Dossier'}
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/applications')}
              >
                Annuler
              </Button>
            </Box>
          </Box>
        </LocalizationProvider>
      </Paper>
    </Container>
  )
}

export default CreateApplication