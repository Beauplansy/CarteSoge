from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Sum
from django.http import HttpResponse
from datetime import datetime, timedelta
from django.utils import timezone
import pandas as pd
import json

from .models import User, CreditApplication, ApplicationHistory, Notification
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer,
    CreditApplicationSerializer, ApplicationHistorySerializer,
    NotificationSerializer, ReportSerializer
)
from .permissions import IsManager, IsOfficer, IsSecretary, IsManagerOrOfficer, CanModifyApplication

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['post'])
    def login(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            # Mettre à jour le dernier login
            user.last_login = timezone.now()
            user.save()
            
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        try:
            refresh_token = request.data.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response({"message": "Déconnexion réussie"}, status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response({"error": "Erreur lors de la déconnexion"}, status=status.HTTP_400_BAD_REQUEST)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.role in ['secretary', 'manager']:
            if user.role == 'secretary':
                return User.objects.filter(role='officer', is_active=True)
            elif user.role == 'manager':
                return User.objects.exclude(id=user.id)
        
        return User.objects.none()
    
    def list(self, request, *args, **kwargs):
        # S'assurer que la réponse contient bien un tableau
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get_permissions(self):
        # Seuls les managers peuvent créer/modifier/supprimer des utilisateurs
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'toggle_active']:
            permission_classes = [IsAuthenticated, IsManager]
        else:
            # Tout utilisateur authentifié peut lister les utilisateurs (avec filtres)
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsManager])
    def toggle_active(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        action = "activé" if user.is_active else "désactivé"
        return Response({
            'message': f'Utilisateur {action} avec succès',
            'is_active': user.is_active
        })

class CreditApplicationViewSet(viewsets.ModelViewSet):
    queryset = CreditApplication.objects.all()
    serializer_class = CreditApplicationSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['statut', 'succursale', 'type_dossier', 'officer_credit']
    
    def get_permissions(self):
        if self.action in ['create']:
            permission_classes = [IsAuthenticated, IsSecretary]
        elif self.action in ['update', 'partial_update']:
            # Utiliser la permission personnalisée pour la modification
            permission_classes = [IsAuthenticated, CanModifyApplication]
        elif self.action in ['assign_officer']:
            permission_classes = [IsAuthenticated, IsManagerOrOfficer]
        elif self.action in ['destroy']:
            permission_classes = [IsAuthenticated, IsManager]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        user = self.request.user
        queryset = CreditApplication.objects.all()
        
        # Filtres selon le rôle
        if user.role == 'secretary':
            # Secrétaires voient les dossiers qu'ils ont créés
            queryset = queryset.filter(created_by=user)
        elif user.role == 'officer':
            # Officiers voient les dossiers qui leur sont assignés
            queryset = queryset.filter(officer_credit=user)
        # Managers voient tous les dossiers
        
        # Filtres de recherche
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(application_id__icontains=search) |
                Q(nom_client__icontains=search) |
                Q(prenom_client__icontains=search) |
                Q(cin__icontains=search)
            )
        
        date_debut = self.request.query_params.get('date_debut', None)
        date_fin = self.request.query_params.get('date_fin', None)
        if date_debut and date_fin:
            queryset = queryset.filter(date_saisie__date__range=[date_debut, date_fin])
        
        return queryset.select_related('created_by', 'officer_credit').order_by('-date_saisie')
    
    def perform_create(self, serializer):
        application = serializer.save(created_by=self.request.user)
        
        # Créer l'historique
        ApplicationHistory.objects.create(
            application=application,
            user=self.request.user,
            action="Création du dossier",
            details=f"Dossier créé par {self.request.user.get_full_name()}"
        )
        
        # Notification si un officier est assigné
        if application.officer_credit:
            Notification.objects.create(
                user=application.officer_credit,
                title="Nouveau dossier assigné",
                message=f"Le dossier {application.application_id} vous a été assigné",
                application=application
            )
    
    def perform_update(self, serializer):
        application = self.get_object()
        user = self.request.user
        
        print(f"🔄 Modification - User: {user.username} ({user.role}), Dossier: {application.id}, Officier: {application.officer_credit}")
        
        # Sauvegarder l'ancienne instance pour comparer les changements
        old_instance = CreditApplication.objects.get(id=application.id)
        
        # Sauvegarder les modifications
        new_instance = serializer.save()
        
        # Vérifier les changements pour l'historique
        changes = []
        fields_to_check = ['statut', 'officer_credit', 'limite_credit_approuve', 'commentaire_traitement', 'type_carte_final', 'raison']
        
        for field in fields_to_check:
            old_value = getattr(old_instance, field)
            new_value = getattr(new_instance, field)
            if old_value != new_value:
                changes.append(f"{field}: {old_value} -> {new_value}")
        
        # Managers peuvent modifier toutes les informations
        if user.role == 'manager':
            client_fields = ['nom_client', 'prenom_client', 'cin', 'telephone_client', 
                            'email_client', 'adresse_client', 'date_naissance',
                            'montant_genere', 'succursale', 'no_succursale', 'autre_succursale',
                            'type_dossier', 'type_campagne', 'date_debut_campagne', 
                            'date_fin_campagne', 'type_carte_application', 'commentaire']
            
            for field in client_fields:
                old_value = getattr(old_instance, field)
                new_value = getattr(new_instance, field)
                if old_value != new_value:
                    changes.append(f"{field}: {old_value} -> {new_value}")
        
        if changes:
            ApplicationHistory.objects.create(
                application=new_instance,
                user=self.request.user,
                action="Modification du dossier",
                details=" | ".join(changes)
            )
            
            print(f"📝 Historique créé: {changes}")
    
    @action(detail=True, methods=['post'])
    def assign_officer(self, request, pk=None):
        application = self.get_object()
        officer_id = request.data.get('officer_id')
        
        print(f"🔧 Assignation - Dossier: {application.id}, Officier: {officer_id}, User: {request.user.username}")
        
        # Vérifier que officer_id est fourni
        if not officer_id:
            return Response(
                {'error': 'ID de l\'officier manquant'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # VÉRIFICATION DES PERMISSIONS
        user = request.user
        
        # Secrétaire ne peut assigner que ses propres dossiers
        if user.role == 'secretary' and application.created_by != user:
            return Response(
                {'error': 'Vous ne pouvez assigner que vos propres dossiers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Officier ne peut pas assigner de dossiers
        if user.role == 'officer':
            return Response(
                {'error': 'Les officiers ne peuvent pas assigner de dossiers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Convertir officer_id en entier
            officer_id_int = int(officer_id)
            officer = User.objects.get(id=officer_id_int, role='officer', is_active=True)
            
            # Vérifier que l'officier n'est pas déjà assigné
            if application.officer_credit == officer:
                return Response(
                    {'error': 'Cet officier est déjà assigné à ce dossier'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            application.officer_credit = officer
            application.save()
            
            # Créer l'historique
            ApplicationHistory.objects.create(
                application=application,
                user=request.user,
                action="Assignation d'officier",
                details=f"Dossier assigné à {officer.get_full_name()} par {request.user.get_full_name()}"
            )
            
            # Notification
            Notification.objects.create(
                user=officer,
                title="Nouveau dossier assigné",
                message=f"Le dossier {application.application_id} ({application.nom_client} {application.prenom_client}) vous a été assigné par {request.user.get_full_name()}",
                application=application
            )
            
            return Response({
                'message': f'Officier {officer.get_full_name()} assigné avec succès',
                'officer_name': officer.get_full_name(),
                'officer_id': officer.id
            })
            
        except ValueError:
            return Response(
                {'error': 'ID d\'officier invalide'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Officier non trouvé ou inactif'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            print(f"❌ Erreur lors de l'assignation: {str(e)}")
            return Response(
                {'error': f'Erreur serveur: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
              )
        
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        application = self.get_object()
        history = ApplicationHistory.objects.filter(application=application)
        serializer = ApplicationHistorySerializer(history, many=True)
        return Response(serializer.data)    

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'Toutes les notifications marquées comme lues'})

class ReportViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsManagerOrOfficer]
    
    @action(detail=False, methods=['post'])
    def generate_report(self, request):
        serializer = ReportSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Filtrer les applications
            queryset = CreditApplication.objects.filter(
                date_saisie__date__range=[data['date_debut'], data['date_fin']]
            )
            
            if data.get('succursale'):
                queryset = queryset.filter(succursale=data['succursale'])
            if data.get('type_application'):
                queryset = queryset.filter(type_dossier=data['type_application'])
            if data.get('statut'):
                queryset = queryset.filter(statut=data['statut'])
            if data.get('officer'):
                queryset = queryset.filter(officer_credit_id=data['officer'])
            
            # Statistiques
            stats = {
                'total': queryset.count(),
                'en_attente': queryset.filter(statut='en_attente').count(),
                'approuve': queryset.filter(statut='approuve').count(),
                'rejete': queryset.filter(statut='rejete').count(),
                'montant_total': queryset.aggregate(Sum('montant_genere'))['montant_genere__sum'] or 0,
            }
            
            applications_data = CreditApplicationSerializer(queryset, many=True).data
            
            return Response({
                'statistiques': stats,
                'applications': applications_data,
                'periode': {
                    'debut': data['date_debut'],
                    'fin': data['date_fin']
                }
            })
        return Response(serializer.errors, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    user = request.user
    today = timezone.now().date()
    last_30_days = today - timedelta(days=30)
    
    if user.role == 'manager':
        # Stats pour le manager
        total_applications = CreditApplication.objects.count()
        pending_applications = CreditApplication.objects.filter(statut='en_attente').count()
        recent_applications = CreditApplication.objects.filter(
            date_saisie__date__gte=last_30_days
        ).count()
        total_users = User.objects.filter(is_active=True).count()
    elif user.role == 'officer':
        # Stats pour l'officier
        total_applications = CreditApplication.objects.filter(officer_credit=user).count()
        pending_applications = CreditApplication.objects.filter(
            officer_credit=user, statut='en_attente'
        ).count()
        recent_applications = CreditApplication.objects.filter(
            officer_credit=user, date_saisie__date__gte=last_30_days
        ).count()
        total_users = 0
    else:
        # Stats pour le secrétaire
        total_applications = CreditApplication.objects.filter(created_by=user).count()
        pending_applications = CreditApplication.objects.filter(
            created_by=user, statut='en_attente'
        ).count()
        recent_applications = CreditApplication.objects.filter(
            created_by=user, date_saisie__date__gte=last_30_days
        ).count()
        total_users = 0
    
    return Response({
        'total_applications': total_applications,
        'pending_applications': pending_applications,
        'recent_applications': recent_applications,
        'total_users': total_users,
    })