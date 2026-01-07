from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import date, timedelta
import uuid


def generate_application_id():
    return f"APP{uuid.uuid4().hex[:12].upper()}"

class User(AbstractUser):
    ROLE_CHOICES = [
        ('secretary', 'Secrétaire de Crédit'),
        ('officer', 'Officier de Crédit'),
        ('manager', 'Responsable de Crédit'),
    ]
    
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='secretary')
    branch = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"

class CreditApplication(models.Model):
    # Informations de base
    application_id = models.CharField(max_length=32, unique=True, editable=False, default=generate_application_id)
    
    # Informations du groupe
    nom_off_groupe = models.CharField(max_length=100)
    prenom_off_groupe = models.CharField(max_length=100)
    
    # Succursale
    SUCCURSALE_CHOICES = [
        ('aeroport2', 'Aeroport2'),
        ('direction_generale', 'Direction Général SogeCarte'),
        ('cap_haitien', 'Cap Haïtien'),
        ('cayes', 'Cayes'),
        ('conseil_administration', 'Conseil d administration SogeCarte'),
        ('frere', 'Frère'),
        ('lalue', 'Lalue'),
        ('petion_ville_iv', 'Pétion-ville IV'),
        ('petion_ville_3', 'Pétion-ville 3'),
        ('rue_pavee', 'Rue Pavée'),
        ('turgeau', 'Turgeau'),
        ('autres', 'Autres'),
    ]
    succursale = models.CharField(max_length=50, choices=SUCCURSALE_CHOICES)
    no_succursale = models.CharField(max_length=20)
    autre_succursale = models.CharField(max_length=100, blank=True)
    
    # Informations client
    nom_client = models.CharField(max_length=100)
    prenom_client = models.CharField(max_length=100)
    date_naissance = models.DateField()
    cin = models.CharField(max_length=50, verbose_name="CIN/NIF/Passeport")
    adresse_client = models.TextField(blank=True)
    telephone_client = models.CharField(max_length=20, blank=True)
    email_client = models.EmailField(blank=True)
    
    # Type de dossier
    TYPE_DOSSIER_CHOICES = [
        ('pre_approuve', 'Pre-Approuvé'),
        ('vente_croisee', 'Vente-croisée'),
        ('campagne', 'Campagne'),
    ]
    type_dossier = models.CharField(max_length=20, choices=TYPE_DOSSIER_CHOICES)
    type_campagne = models.CharField(max_length=100, blank=True)
    date_debut_campagne = models.DateField(null=True, blank=True)
    date_fin_campagne = models.DateField(null=True, blank=True)
    
    # Type de carte
    TYPE_CARTE_CHOICES = [
        ('credit', 'Carte de crédit'),
        ('sogephone', 'SogePhone'),
        ('tele_haiti', 'Télé Haïti'),
        ('digicel', 'Digicel'),
        ('american', 'American'),
    ]
    type_carte_application = models.CharField(max_length=20, choices=TYPE_CARTE_CHOICES)
    
    # Assignation
    officer_credit = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     limit_choices_to={'role': 'officer'})
    
    # Statut et montant
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('approuve', 'Approuvé'),
        ('rejete', 'Rejeté'),
    ]
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')
    montant_genere = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Informations de saisie
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='dossiers_crees')
    date_saisie = models.DateTimeField(auto_now_add=True)
    commentaire = models.TextField(blank=True)
    
    # Champs de traitement (remplis par l'officier)
    TYPE_CARTE_FINAL_CHOICES = [
        ('master_gold', 'MASTER CARD GOLD'),
        ('master_gold_aa', 'MASTER CARD GOLD AA'),
        ('master_intl', 'MASTER CARD INT\'L'),
        ('master_local', 'MASTER CARD LOCAL'),
        ('master_black', 'MASTER CARD BLACK'),
        ('visa_business', 'VISA BUSINESS'),
        ('visa_gold', 'VISA GOLD'),
        ('visa_intl', 'VISA INT\'L'),
        ('visa_local', 'VISA LOCAL'),
        ('visa_platinum', 'VISA PLATINUM'),
    ]
    type_carte_final = models.CharField(max_length=20, choices=TYPE_CARTE_FINAL_CHOICES, blank=True)
    
    RAISON_CHOICES = [
        ('gage_demande', 'GAGE DEMANDE'),
        ('application_signee', 'APPLICATION SIGNEE'),
        ('client_introuvable', 'CLIENT INTROUVABLE'),
        ('employeur_impossible', 'EMPLOYEUR IMPOSSIBLE A TROUVER'),
        ('pieces_manquante', 'PIECES MANQUANTE'),
    ]
    raison = models.CharField(max_length=30, choices=RAISON_CHOICES, blank=True)
    
    limite_credit_approuve = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    date_decision = models.DateField(null=True, blank=True)
    commentaire_traitement = models.TextField(blank=True)
    
    # Métadonnées
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Validation personnalisée pour le modèle"""
        errors = {}
        
        # Validation de la date de naissance (au moins 10 ans)
        if self.date_naissance:
            age_minimum = timezone.now().date() - timedelta(days=365 * 10)
            if self.date_naissance > age_minimum:
                errors['date_naissance'] = 'Le client doit avoir au moins 10 ans.'
        
        # Validation du montant (minimum 1000 HTG)
        if self.montant_genere and self.montant_genere < 1000:
            errors['montant_genere'] = 'Le montant doit être d\'au moins 1,000 HTG.'
        
        # Validation de la date de décision (ne peut pas être dans le futur)
        if self.date_decision and self.date_decision > timezone.now().date():
            errors['date_decision'] = 'La date de décision ne peut pas être dans le futur.'
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Conversion automatique en majuscules avant sauvegarde
        self.nom_off_groupe = self.nom_off_groupe.upper() if self.nom_off_groupe else ''
        self.prenom_off_groupe = self.prenom_off_groupe.upper() if self.prenom_off_groupe else ''
        self.nom_client = self.nom_client.upper() if self.nom_client else ''
        self.prenom_client = self.prenom_client.upper() if self.prenom_client else ''
        self.cin = self.cin.upper() if self.cin else ''
        self.adresse_client = self.adresse_client.upper() if self.adresse_client else ''
        self.telephone_client = self.telephone_client.upper() if self.telephone_client else ''
        # Email reste en minuscules
        
        # Validation avant sauvegarde
        self.full_clean()
        
        # application_id is generated by default using `generate_application_id`
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.application_id} - {self.nom_client} {self.prenom_client}"

class ApplicationHistory(models.Model):
    application = models.ForeignKey(CreditApplication, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=100)
    details = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    application = models.ForeignKey(CreditApplication, on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']