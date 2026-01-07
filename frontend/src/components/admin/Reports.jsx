import React, { useState, useEffect } from 'react'
import { reportAPI, userAPI } from '../../services/api'
import {
  Box, Paper, Typography, Button, Grid, MenuItem,
  FormControl, InputLabel, Select,
  Alert, CircularProgress, Chip
} from '@mui/material'
import {
  PictureAsPdf as PdfIcon,
  Assessment as ReportIcon,
  TableChart as CsvIcon
} from '@mui/icons-material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const Reports = () => {
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [officers, setOfficers] = useState([])
  const [error, setError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const [filters, setFilters] = useState({
    date_debut: null,
    date_fin: null,
    succursale: '',
    type_application: '',
    statut: '',
    officer: ''
  })

  const statutChoices = [
    { value: 'recues', label: 'Reçues' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'approuve', label: 'Approuvées' },
    { value: 'rejete', label: 'Rejetées' }
  ]

  const typeApplicationChoices = [
    { value: 'pre_approuve', label: 'Pre-Approuvé' },
    { value: 'vente_croisee', label: 'Vente-croisée' },
    { value: 'campagne', label: 'Campagne' }
  ]

  const succursaleChoices = [
    'aeroport2', 'cap_haitien', 'cayes', 'lalue', 
    'direction_generale', 'conseil_administration', 
    'frere', 'petion_ville_iv', 'petion_ville_3', 'rue_pavee', 'turgeau', 'autres'
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
      console.log('🔄 Génération du rapport avec filtres:', filters)

      // Préparer les données pour l'API
      const reportData = {
        date_debut: filters.date_debut.toISOString().split('T')[0],
        date_fin: filters.date_fin.toISOString().split('T')[0],
        succursale: filters.succursale || '',
        type_application: filters.type_application || '',
        statut: filters.statut || '',
      }

      // Gérer le champ officer séparément
      if (filters.officer && filters.officer !== '') {
        const officerId = parseInt(filters.officer)
        if (!isNaN(officerId) && officerId > 0) {
          reportData.officer = officerId
        }
      }

      console.log('📤 Données envoyées à l\'API:', reportData)

      const response = await reportAPI.generateReport(reportData)
      console.log('✅ Réponse rapport:', response.data)
      setReportData(response.data)
      
    } catch (error) {
      console.error('❌ Erreur génération rapport:', error)
      
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object') {
          const errorMessages = Object.values(errorData).flat()
          setError(`Erreur de validation: ${errorMessages.join(', ')}`)
        } else {
          setError(errorData || 'Erreur lors de la génération du rapport')
        }
      } else {
        setError('Erreur de connexion au serveur')
      }
    } finally {
      setLoading(false)
    }
  }

  const exportToPDF = async () => {
    if (!reportData) {
      alert('Veuillez d\'abord générer un rapport')
      return
    }

    setPdfLoading(true)

    try {
      // Créer un élément temporaire pour le PDF
      const pdfElement = document.createElement('div')
      pdfElement.style.position = 'absolute'
      pdfElement.style.left = '-9999px'
      pdfElement.style.top = '0'
      pdfElement.style.width = '210mm' // Format A4
      pdfElement.style.padding = '20mm'
      pdfElement.style.fontFamily = 'Arial, sans-serif'
      pdfElement.style.backgroundColor = 'white'
      
      // Obtenir la date actuelle formatée
      const today = new Date()
      const dateFormatted = today.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
      
      // Construire le contenu HTML pour le PDF
      const reportTitle = getReportTitle()
      const dateDebut = filters.date_debut.toLocaleDateString('fr-FR')
      const dateFin = filters.date_fin.toLocaleDateString('fr-FR')
      const totalApplications = reportData.statistiques?.total || 0
      const succursaleStats = reportData.succursale_stats || {}
      
      let htmlContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1976d2; font-size: 24px; margin-bottom: 10px;">SOGEAPP CREDIT</h1>
          <h2 style="font-size: 20px; margin-bottom: 15px;">${reportTitle}</h2>
          <h3 style="font-size: 16px; font-weight: bold;">
            Du: ${dateDebut} Au: ${dateFin}
          </h3>
        </div>
        
        <div style="text-align: center; margin-bottom: 30px;">
          <h4 style="font-size: 18px; text-decoration: underline; color: #333;">
            STATISTIQUES GLOBALES PAR SUCCURSALE
          </h4>
        </div>
      `

      // Ajouter les statistiques par succursale
      Object.entries(succursaleStats).forEach(([succursale, stats], index) => {
        htmlContent += `
          <div style="margin-bottom: 20px; padding: 15px; background-color: ${index % 2 === 0 ? '#f8f9fa' : '#ffffff'}; border: 1px solid #dee2e6; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #1976d2;">
              <h5 style="font-weight: bold; font-size: 16px; color: #1976d2; margin: 0;">${succursale.toUpperCase()}</h5>
              <span style="font-weight: bold; font-size: 15px;">${stats.total} application(s)</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
              <div style="text-align: center; padding: 8px; flex: 1; min-width: 150px;">
                <span style="color: #d32f2f; font-weight: bold;">Rejetées: ${stats.rejete}</span>
              </div>
              <div style="text-align: center; padding: 8px; flex: 1; min-width: 150px;">
                <span style="color: #ed6c02; font-weight: bold;">En attente: ${stats.en_attente}</span>
              </div>
              <div style="text-align: center; padding: 8px; flex: 1; min-width: 150px;">
                <span style="color: #2e7d32; font-weight: bold;">Traitées: ${stats.approuve}</span>
              </div>
              <div style="text-align: center; padding: 8px; flex: 1; min-width: 150px;">
                <span style="color: #1976d2; font-weight: bold;">Total: ${stats.total}</span>
              </div>
            </div>
          </div>
        `
      })

      // Ajouter le total général
      htmlContent += `
        <div style="display: flex; justify-content: space-between; margin-top: 30px; padding: 20px; border-top: 3px solid #000; background-color: #e3f2fd; border-radius: 8px; font-size: 18px;">
          <span style="font-weight: bold; color: #333;">Total Général:</span>
          <span style="font-weight: bold; color: #1976d2;">${totalApplications}</span>
        </div>
        
        <!-- Pied de page avec date dynamique -->
        <div style="position: fixed; bottom: 20mm; left: 20mm; right: 20mm; display: flex; justify-content: space-between; padding-top: 15px; border-top: 1px solid #ccc; font-size: 12px; color: #666; background: white; z-index: 1000;">
          <span>Généré le: ${dateFormatted}</span>
          <span>Page 1 sur 1</span>
        </div>
        
        <!-- Ajouter un espace pour le pied de page -->
        <div style="height: 50mm;"></div>
      `

      pdfElement.innerHTML = htmlContent
      document.body.appendChild(pdfElement)

      // Générer le PDF avec des options améliorées
      const canvas = await html2canvas(pdfElement, {
        scale: 2, // Meilleure qualité
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowHeight: pdfElement.scrollHeight
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Ajouter l'image
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)

      // Générer le nom du fichier
      const fileName = `${reportTitle.toLowerCase().replace(/ /g, '_')}_${filters.date_debut.toISOString().split('T')[0]}_${filters.date_fin.toISOString().split('T')[0]}.pdf`
      
      // Télécharger le PDF
      pdf.save(fileName)

      // Nettoyer
      document.body.removeChild(pdfElement)

    } catch (error) {
      console.error('❌ Erreur lors de la génération du PDF:', error)
      alert('Erreur lors de la génération du fichier PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const exportToCSV = async () => {
    if (!filters.date_debut || !filters.date_fin) {
      alert('Veuillez d\'abord générer un rapport')
      return
    }

    try {
      const reportData = {
        date_debut: filters.date_debut.toISOString().split('T')[0],
        date_fin: filters.date_fin.toISOString().split('T')[0],
        succursale: filters.succursale || '',
        type_application: filters.type_application || '',
        statut: filters.statut || 'recues',
      }

      if (filters.officer && filters.officer !== '') {
        const officerId = parseInt(filters.officer)
        if (!isNaN(officerId) && officerId > 0) {
          reportData.officer = officerId
        }
      }

      console.log('📤 Export CSV avec données:', reportData)

      const response = await reportAPI.exportCsv(reportData)
      
      // Créer un blob et télécharger le fichier
      const blob = new Blob([response.data], { type: 'text/csv; charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      
      const dateDebut = filters.date_debut.toISOString().split('T')[0]
      const dateFin = filters.date_fin.toISOString().split('T')[0]
      
      // Nom du fichier selon le statut
      let fileName = 'rapport_recues'
      if (filters.statut === 'en_attente') {
        fileName = 'rapport_en_attente'
      } else if (filters.statut === 'approuve') {
        fileName = 'rapport_approuvees'
      } else if (filters.statut === 'rejete') {
        fileName = 'rapport_rejetees'
      }
      
      link.download = `${fileName}_${dateDebut}_${dateFin}.csv`
      
      link.href = url
      link.click()
      window.URL.revokeObjectURL(url)
      
      console.log('✅ Fichier CSV exporté avec succès')
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'export CSV:', error)
      alert('Erreur lors de la génération du fichier CSV')
    }
  }

  // Fonction pour obtenir le titre du rapport basé sur les filtres
  const getReportTitle = () => {
    if (!reportData) return 'APPLICATIONS RECUES'
    
    const statutFiltre = filters.statut
    if (statutFiltre === 'recues' || !statutFiltre) {
      return 'APPLICATIONS RECUES'
    } else if (statutFiltre === 'en_attente') {
      return 'APPLICATIONS EN ATTENTE'
    } else if (statutFiltre === 'approuve') {
      return 'APPLICATIONS APPROUVÉES'
    } else if (statutFiltre === 'rejete') {
      return 'APPLICATIONS REJETÉES'
    } else {
      return 'APPLICATIONS RECUES'
    }
  }

  // Fonction pour gérer l'impression via le navigateur
  const handlePrint = () => {
    if (!reportData) {
      alert('Veuillez d\'abord générer un rapport')
      return
    }

    // Créer un conteneur pour l'impression
    const printContainer = document.createElement('div')
    printContainer.style.position = 'absolute'
    printContainer.style.left = '-9999px'
    printContainer.style.top = '0'
    printContainer.style.width = '210mm'
    printContainer.style.padding = '20mm'
    printContainer.style.fontFamily = 'Arial, sans-serif'
    printContainer.style.backgroundColor = 'white'

    const today = new Date()
    const dateFormatted = today.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    const reportTitle = getReportTitle()
    const dateDebut = filters.date_debut.toLocaleDateString('fr-FR')
    const dateFin = filters.date_fin.toLocaleDateString('fr-FR')
    const totalApplications = reportData.statistiques?.total || 0
    const succursaleStats = reportData.succursale_stats || {}
    
    let htmlContent = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000; font-size: 24px; margin-bottom: 10px; font-weight: bold;">SOGEAPP CREDIT</h1>
        <h2 style="font-size: 20px; margin-bottom: 15px; font-weight: bold; text-transform: uppercase;">${reportTitle}</h2>
        <h3 style="font-size: 16px; font-weight: bold;">
          <span style="font-weight: bold;">Du:</span> ${dateDebut} <span style="font-weight: bold;">Au:</span> ${dateFin}
        </h3>
      </div>
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h4 style="font-size: 18px; text-decoration: underline; color: #000; font-weight: bold;">
          STATISTIQUES GLOBALES PAR SUCCURSALE
        </h4>
      </div>
    `

    // Ajouter les statistiques par succursale
    Object.entries(succursaleStats).forEach(([succursale, stats], index) => {
      htmlContent += `
        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #000; page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #000;">
            <h5 style="font-weight: bold; font-size: 16px; color: #000; margin: 0; text-transform: uppercase;">${succursale}</h5>
            <span style="font-weight: bold; font-size: 15px;">${stats.total} application(s)</span>
          </div>
          
          <div style="display: flex; justify-content: space-between; flex-wrap: wrap;">
            <div style="text-align: center; padding: 8px; flex: 1; min-width: 150px;">
              <span style="color: #000; font-weight: bold;">Rejetées: ${stats.rejete}</span>
            </div>
            <div style="text-align: center; padding: 8px; flex: 1; min-width: 150px;">
              <span style="color: #000; font-weight: bold;">En attente: ${stats.en_attente}</span>
            </div>
            <div style="text-align: center; padding: 8px; flex: 1; min-width: 150px;">
              <span style="color: #000; font-weight: bold;">Traitées: ${stats.approuve}</span>
            </div>
            <div style="text-align: center; padding: 8px; flex: 1; min-width: 150px;">
              <span style="color: #000; font-weight: bold;">Total: ${stats.total}</span>
            </div>
          </div>
        </div>
      `
    })

    // Ajouter le total général
    htmlContent += `
      <div style="display: flex; justify-content: space-between; margin-top: 30px; padding: 20px; border-top: 3px solid #000; background-color: #f0f0f0; font-size: 18px; page-break-inside: avoid;">
        <span style="font-weight: bold; color: #000;">Total Général:</span>
        <span style="font-weight: bold; color: #000;">${totalApplications}</span>
      </div>
      
      <!-- Pied de page -->
      <div style="position: fixed; bottom: 0; left: 0; right: 0; padding: 10px 20px; border-top: 1px solid #000; font-size: 12px; color: #000; background: white; display: flex; justify-content: space-between; margin-top: 50px;">
        <span>Généré le: ${dateFormatted}</span>
        <span>Page 1 sur 1</span>
      </div>
      
      <!-- Espace pour le pied de page -->
      <div style="height: 80px;"></div>
    `

    printContainer.innerHTML = htmlContent
    document.body.appendChild(printContainer)

    // Ouvrir la fenêtre d'impression
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          @media print {
            @page {
              margin: 20mm;
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
            }
            .print-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              padding: 10px 20px;
              border-top: 1px solid #000;
              font-size: 12px;
              color: #000;
              background: white;
              display: flex;
              justify-content: space-between;
            }
            .page-break {
              page-break-before: always;
            }
            .avoid-break {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        ${printContainer.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `)
    
    printWindow.document.close()

    // Nettoyer après impression
    setTimeout(() => {
      document.body.removeChild(printContainer)
    }, 1000)
  }

  // Fonction pour générer le rapport formaté selon le document
  const renderFormattedReport = () => {
    if (!reportData) return null;

    const totalApplications = reportData.statistiques?.total || 0
    const succursaleStats = reportData.succursale_stats || {}
    const reportTitle = getReportTitle()

    // Obtenir la date actuelle formatée pour le rapport
    const today = new Date()
    const dateFormatted = today.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return (
      <Paper 
        id="report-content"
        sx={{ 
          p: { xs: 2, sm: 4 }, 
          mt: 3, 
          fontFamily: 'Arial, sans-serif',
          maxWidth: { xs: '100%', md: 900 },
          mx: 'auto',
          boxShadow: 3,
          border: '2px solid #333',
          position: 'relative',
          backgroundColor: 'white',
          boxSizing: 'border-box',
          '@media print': {
            boxShadow: 'none',
            border: 'none',
            maxWidth: '100%',
            margin: '0',
            padding: '20px',
            pageBreakInside: 'avoid'
          }
        }}
      >
        {/* En-tête du rapport formaté */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: 4,
          '@media print': {
            pageBreakInside: 'avoid'
          }
        }}>
          <Typography variant="h4" fontWeight="bold" sx={{ 
            mb: 2, 
            fontSize: '1.8rem', 
            color: '#1976d2',
            '@media print': {
              color: '#000000',
              fontSize: '24pt',
              marginBottom: '10px'
            }
          }}>
            SOGEAPP CREDIT
          </Typography>
          <Typography variant="h5" fontWeight="bold" sx={{ 
            mb: 1, 
            fontSize: '1.5rem', 
            color: '#000000',
            textTransform: 'uppercase',
            '@media print': {
              fontSize: '18pt',
              marginBottom: '5px'
            }
          }}>
            {reportTitle}
          </Typography>
          <Typography variant="h6" sx={{ 
            fontSize: '1.2rem', 
            fontWeight: 'bold',
            '@media print': {
              fontSize: '14pt',
              marginBottom: '20px'
            }
          }}>
            <strong>Du:</strong> {filters.date_debut.toLocaleDateString('fr-FR')} <strong>Au:</strong> {filters.date_fin.toLocaleDateString('fr-FR')}
          </Typography>
        </Box>

        {/* Section STATISTIQUES GLOBALES PAR SUCCURSALE */}
        <Box sx={{ 
          mb: 4,
          '@media print': {
            pageBreakInside: 'avoid'
          }
        }}>
          <Typography variant="h5" fontWeight="bold" sx={{ 
            mb: 3, 
            textAlign: 'center',
            fontSize: '1.4rem',
            textDecoration: 'underline',
            color: '#333',
            '@media print': {
              fontSize: '16pt',
              color: '#000000',
              marginBottom: '20px'
            }
          }}>
            STATISTIQUES GLOBALES PAR SUCCURSALE
          </Typography>
          
          {/* Liste des succursales avec leurs statistiques détaillées */}
          {Object.entries(succursaleStats).length > 0 ? (
            Object.entries(succursaleStats).map(([succursale, stats]) => (
              <Box 
                key={succursale} 
                sx={{ 
                  mb: 3,
                  p: 2,
                  backgroundColor: '#f8f9fa',
                  borderRadius: 2,
                  border: '1px solid #dee2e6',
                  '@media print': {
                    backgroundColor: 'transparent',
                    border: '1px solid #000000',
                    borderRadius: '0',
                    marginBottom: '15px',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid'
                  }
                }}
              >
                {/* En-tête de la succursale */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 2,
                  pb: 1,
                  borderBottom: '2px solid #1976d2',
                  '@media print': {
                    borderBottom: '2px solid #000000'
                  }
                }}>
                  <Typography sx={{ 
                    fontWeight: 'bold', 
                    fontSize: '1.2rem', 
                    color: '#1976d2',
                    textTransform: 'uppercase',
                    '@media print': {
                      color: '#000000',
                      fontSize: '14pt'
                    }
                  }}>
                    {succursale}
                  </Typography>
                  <Typography sx={{ 
                    fontWeight: 'bold', 
                    fontSize: '1.1rem',
                    '@media print': {
                      fontSize: '12pt',
                      color: '#000000'
                    }
                  }}>
                    {stats.total} application(s)
                  </Typography>
                </Box>
                
                {/* Détails des statuts */}
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 1,
                      '@media print': {
                        padding: '5px'
                      }
                    }}>
                      <Typography sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        color: '#d32f2f',
                        '@media print': {
                          color: '#000000',
                          fontSize: '11pt'
                        }
                      }}>
                        Rejetées: {stats.rejete}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 1,
                      '@media print': {
                        padding: '5px'
                      }
                    }}>
                      <Typography sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        color: '#ed6c02',
                        '@media print': {
                          color: '#000000',
                          fontSize: '11pt'
                        }
                      }}>
                        En attente: {stats.en_attente}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 1,
                      '@media print': {
                        padding: '5px'
                      }
                    }}>
                      <Typography sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        color: '#2e7d32',
                        '@media print': {
                          color: '#000000',
                          fontSize: '11pt'
                        }
                      }}>
                        Traitées: {stats.approuve}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Box sx={{ 
                      textAlign: 'center', 
                      p: 1,
                      '@media print': {
                        padding: '5px'
                      }
                    }}>
                      <Typography sx={{ 
                        fontWeight: 'bold',
                        fontSize: '0.9rem',
                        color: '#1976d2',
                        '@media print': {
                          color: '#000000',
                          fontSize: '11pt'
                        }
                      }}>
                        Total: {stats.total}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            ))
          ) : (
            <Box sx={{ 
              textAlign: 'center', 
              py: 3,
              backgroundColor: '#f9f9f9',
              borderRadius: 1,
              '@media print': {
                backgroundColor: 'transparent'
              }
            }}>
              <Typography sx={{ 
                fontStyle: 'italic', 
                color: '#666',
                '@media print': {
                  color: '#000000'
                }
              }}>
                Aucune donnée trouvée pour les critères sélectionnés
              </Typography>
            </Box>
          )}
          
          {/* Total général */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            mt: 4, 
            pt: 3, 
            borderTop: '3px solid #000',
            fontSize: '1.3rem',
            px: 2,
            backgroundColor: '#e3f2fd',
            borderRadius: 1,
            py: 2,
            '@media print': {
              backgroundColor: '#f0f0f0',
              borderTop: '3px solid #000000',
              marginTop: '30px',
              padding: '15px 20px',
              pageBreakInside: 'avoid'
            }
          }}>
            <Typography sx={{ 
              fontWeight: 'bold', 
              color: '#333',
              '@media print': {
                color: '#000000',
                fontSize: '14pt'
              }
            }}>
              Total Général:
            </Typography>
            <Typography sx={{ 
              fontWeight: 'bold', 
              color: '#1976d2',
              '@media print': {
                color: '#000000',
                fontSize: '14pt'
              }
            }}>
              {totalApplications}
            </Typography>
          </Box>
        </Box>

        {/* Pied de page - Invisible à l'écran mais visible à l'impression */}
        <Box 
          id="report-footer"
          sx={{ 
            display: 'none',
            '@media print': {
              display: 'flex',
              justifyContent: 'space-between',
              position: 'fixed',
              bottom: '20px',
              left: '20px',
              right: '20px',
              paddingTop: '10px',
              borderTop: '1px solid #000000',
              fontSize: '10pt',
              color: '#000000',
              backgroundColor: 'white',
              zIndex: 1000,
              pageBreakInside: 'avoid'
            }
          }}
        >
          <Typography>
            Généré le: {dateFormatted}
          </Typography>
          <Typography>Page 1 sur 1</Typography>
        </Box>

        {/* Espace pour le pied de page dans l'impression */}
        <Box sx={{ 
          display: 'none',
          '@media print': {
            display: 'block',
            height: '50px',
            visibility: 'hidden'
          }
        }} />
      </Paper>
    )
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ 
        mb: 3, 
        color: '#1976d2', 
        fontWeight: 'bold',
        '@media print': {
          display: 'none'
        }
      }}>
        Génération de Rapports
      </Typography>

      {/* Section des filtres */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        boxShadow: 2,
        '@media print': {
          display: 'none'
        }
      }}>
        <Typography variant="h6" gutterBottom sx={{ color: '#333', fontWeight: 'bold' }}>
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
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Date Fin"
                value={filters.date_fin}
                onChange={(date) => handleFilterChange('date_fin', date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true
                  }
                }}
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
                      {branch.replace(/_/g, ' ').toUpperCase()}
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
                  <MenuItem value="recues">Reçues (Tous)</MenuItem>
                  <MenuItem value="en_attente">En attente</MenuItem>
                  <MenuItem value="approuve">Approuvées</MenuItem>
                  <MenuItem value="rejete">Rejetées</MenuItem>
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
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  onClick={generateReport}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <ReportIcon />}
                  size="large"
                  sx={{ backgroundColor: '#1976d2' }}
                >
                  {loading ? 'Génération...' : 'Générer Rapport'}
                </Button>
                
                {reportData && (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={pdfLoading ? <CircularProgress size={20} /> : <PdfIcon />}
                      onClick={exportToPDF}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? 'Génération PDF...' : 'Exporter PDF'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CsvIcon />}
                      onClick={exportToCSV}
                      color="success"
                    >
                      Exporter CSV
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<PdfIcon />}
                      onClick={handlePrint}
                      color="primary"
                      sx={{ 
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: '#45a049'
                        }
                      }}
                    >
                      Imprimer
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>

      {/* Affichage du rapport formaté */}
      {reportData && renderFormattedReport()}

      {/* Styles CSS globaux pour l'impression */}
      <style>
        {`
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              font-family: Arial, sans-serif !important;
            }
            
            /* Masquer tout sauf le rapport */
            body > *:not(#report-content) {
              display: none !important;
            }
            
            /* Style du pied de page */
            #report-footer {
              display: flex !important;
              visibility: visible !important;
              opacity: 1 !important;
            }
            
            /* Espacement pour éviter que le contenu soit coupé */
            #report-content {
              margin-bottom: 60px !important;
            }
            
            /* Éviter les sauts de page à l'intérieur des sections */
            .MuiBox-root {
              page-break-inside: avoid !important;
            }
            
            /* Couleurs pour l'impression */
            * {
              color: black !important;
              background-color: transparent !important;
              box-shadow: none !important;
            }
          }
        `}
      </style>
    </Box>
  )
}

export default Reports