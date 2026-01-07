from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
import re
from .models import User, CreditApplication, ApplicationHistory, Notification, AuditLog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name',
                 'role', 'branch', 'phone', 'is_active', 'date_joined')
        read_only_fields = ('date_joined',)

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'first_name',
                 'last_name', 'role', 'branch', 'phone')
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("Ce compte est désactivé.")
                data['user'] = user
            else:
                raise serializers.ValidationError("Identifiants invalides.")
        else:
            raise serializers.ValidationError("Must include username and password.")
        return data

class CreditApplicationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    officer_name = serializers.CharField(source='officer_credit.get_full_name', read_only=True)
    succursale_display = serializers.CharField(source='get_succursale_display', read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    type_dossier_display = serializers.CharField(source='get_type_dossier_display', read_only=True)
    type_carte_application_display = serializers.CharField(source='get_type_carte_application_display', read_only=True)
    date_creation_formatee = serializers.SerializerMethodField()
    
    class Meta:
        model = CreditApplication
        fields = '__all__'
        read_only_fields = ('application_id', 'created_by', 'date_saisie', 'updated_at')
    
    def get_date_creation_formatee(self, obj):
        """Retourne la date de création formatée"""
        if obj.date_saisie:
            return obj.date_saisie.strftime('%d/%m/%Y %H:%M')
        return None
    
    def validate_montant_genere(self, value):
        """Validation du montant minimum"""
        if value and value < 1000:
            raise serializers.ValidationError("Le montant doit être d'au moins 1,000 HTG.")
        return value
    
    def validate_date_naissance(self, value):
        """Validation de la date de naissance (au moins 10 ans)"""
        if value:
            age_minimum = timezone.now().date() - timedelta(days=365 * 10)
            if value > age_minimum:
                raise serializers.ValidationError("Le client doit avoir au moins 10 ans.")
        return value
    
    def validate_date_decision(self, value):
        """Validation de la date de décision"""
        if value and value > timezone.now().date():
            raise serializers.ValidationError("La date de décision ne peut pas être dans le futur.")
        return value
    
    def validate(self, data):
        """Validation globale et conversion en majuscules"""
        user = self.context['request'].user
        
        # Conversion automatique en majuscules (sauf email)
        fields_to_upper = [
            'nom_off_groupe', 'prenom_off_groupe', 'nom_client', 
            'prenom_client', 'cin', 'adresse_client', 'telephone_client'
        ]
        
        for field in fields_to_upper:
            if field in data and data[field]:
                data[field] = data[field].upper()
        
        # Validation pour la réévaluation (officiers et managers)
        if self.instance and self.instance.statut in ['approuve', 'rejete']:
            if user.role in ['officer', 'manager']:
                # Permettre la réévaluation seulement pour les officiers et managers
                if 'statut' in data and data['statut'] not in ['approuve', 'rejete', 'en_attente']:
                    raise serializers.ValidationError(
                        "Statut invalide pour la réévaluation. Utilisez 'approuve', 'rejete' ou 'en_attente'."
                    )
            else:
                raise serializers.ValidationError(
                    "Seuls les officiers et managers peuvent réévaluer les dossiers déjà traités."
                )
        
        # Si c'est une mise à jour
        if self.instance:
            # Managers peuvent modifier toutes les informations
            if user.role == 'manager':
                # Aucune restriction pour les managers
                pass
                
            # Officiers ne peuvent pas modifier les informations client de base
            elif user.role == 'officer':
                forbidden_fields = ['nom_client', 'prenom_client', 'cin', 'telephone_client',
                                  'email_client', 'adresse_client', 'date_naissance',
                                  'montant_genere', 'succursale', 'type_dossier',
                                  'type_carte_application', 'created_by']
                
                for field in forbidden_fields:
                    if field in data:
                        raise serializers.ValidationError(
                            f"Les officiers ne peuvent pas modifier le champ '{field}'"
                        )
            
            # Secrétaires ne peuvent modifier aucun champ
            elif user.role == 'secretary':
                raise serializers.ValidationError(
                    "Les secrétaires ne peuvent pas modifier les dossiers"
                )
        
        return data
    
    def to_representation(self, instance):
        """Formatage des données pour l'affichage"""
        representation = super().to_representation(instance)
        
        # Conversion en majuscules pour l'affichage (sauf email)
        fields_to_upper = [
            'nom_off_groupe', 'prenom_off_groupe', 'nom_client', 
            'prenom_client', 'cin', 'adresse_client', 'telephone_client'
        ]
        
        for field in fields_to_upper:
            if representation.get(field):
                representation[field] = representation[field].upper()
        
        return representation

class ApplicationHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = ApplicationHistory
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'

class ReportSerializer(serializers.Serializer):
    date_debut = serializers.DateField()
    date_fin = serializers.DateField()
    succursale = serializers.CharField(required=False, allow_blank=True)
    type_application = serializers.CharField(required=False, allow_blank=True)
    statut = serializers.CharField(required=False, allow_blank=True)
    officer = serializers.IntegerField(required=False)

    def validate_officer(self, value):
        """Validation personnalisée pour le champ officer"""
        if value == '' or value is None:
            return None
        return value

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ('id', 'user', 'user_name', 'action', 'action_display', 'resource_type', 
                 'resource_id', 'resource_display', 'ip_address', 'status', 'status_display',
                 'changes', 'error_message', 'timestamp')
        read_only_fields = ('id', 'timestamp')