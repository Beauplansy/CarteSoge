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
import csv
import codecs

from .models import User, CreditApplication, ApplicationHistory, Notification
import logging

logger = logging.getLogger(__name__)
from .serializers import (
    UserSerializer, UserCreateSerializer, LoginSerializer,
    CreditApplicationSerializer, ApplicationHistorySerializer,
    NotificationSerializer, ReportSerializer
)
from .permissions import IsManager, IsOfficer, IsSecretary, IsManagerOrOfficer, IsManagerOrSecretary, CanModifyApplication

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
            # Secrétaires ET managers peuvent créer des dossiers
            permission_classes = [IsAuthenticated, IsManagerOrSecretary]
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
        # Managers, secrétaires et officiers voient TOUS les dossiers
        # (Secrétaires et officiers peuvent consulter l'ensemble du système)
        # Pas de filtrage par créateur ou assignation
        
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
        
        logger.info(f"Modification - User: {user.username} ({user.role}), Dossier: {application.id}, Officier: {application.officer_credit}")
        
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
            logger.info("Historique créé: %s", changes)
    
    @action(detail=True, methods=['post'])
    def assign_officer(self, request, pk=None):
        application = self.get_object()
        officer_id = request.data.get('officer_id')
        
        logger.info(f"Assignation - Dossier: {application.id}, Officier: {officer_id}, User: {request.user.username}")
        
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
            
            # Vérifier si réaffectation (changement d'officier)
            old_officer = application.officer_credit
            is_reassignment = old_officer is not None and old_officer != officer
            
            # Managers peuvent réaffecter; autres seulement assigner pour la première fois
            if is_reassignment and user.role != 'manager':
                return Response(
                    {'error': 'Seuls les managers peuvent réaffecter un dossier à un autre officier'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Si déjà assigné au même officier, pas de changement
            if application.officer_credit == officer:
                return Response(
                    {'error': 'Cet officier est déjà assigné à ce dossier'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            application.officer_credit = officer
            application.save()
            
            # Créer l'historique avec action spécifique
            if is_reassignment:
                action_desc = "Réaffectation d'officier"
                details = f"Dossier réaffecté de {old_officer.get_full_name()} à {officer.get_full_name()} par {request.user.get_full_name()}"
            else:
                action_desc = "Assignation d'officier"
                details = f"Dossier assigné à {officer.get_full_name()} par {request.user.get_full_name()}"
            
            ApplicationHistory.objects.create(
                application=application,
                user=request.user,
                action=action_desc,
                details=details
            )
            
            # Notification au nouvel officier
            message_prefix = "réaffecté" if is_reassignment else "assigné"
            Notification.objects.create(
                user=officer,
                title="Nouveau dossier assigné",
                message=f"Le dossier {application.application_id} ({application.nom_client} {application.prenom_client}) vous a été {message_prefix} par {request.user.get_full_name()}",
                application=application
            )
            
            # Notification à l'ancien officier (si réaffectation)
            if is_reassignment:
                Notification.objects.create(
                    user=old_officer,
                    title="Dossier réaffecté",
                    message=f"Le dossier {application.application_id} ({application.nom_client} {application.prenom_client}) vous a été retiré et réaffecté à {officer.get_full_name()}",
                    application=application
                )
            
            message_type = "réaffecter" if is_reassignment else "assigner"
            return Response({
                'message': f'Officier {officer.get_full_name()} {message_type} avec succès',
                'officer_name': officer.get_full_name(),
                'officer_id': officer.id,
                'is_reassignment': is_reassignment
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
            logger.exception("Erreur lors de l'assignation: %s", str(e))
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
            
            # Gestion spéciale pour le statut "recues" (tous les statuts)
            if data.get('statut') and data.get('statut') != 'recues':
                queryset = queryset.filter(statut=data['statut'])
            # Si statut est "recues" ou vide, on prend tous les statuts
            
            if data.get('officer'):
                queryset = queryset.filter(officer_credit_id=data['officer'])
            
            # Statistiques globales
            stats = {
                'total': queryset.count(),
                'en_attente': queryset.filter(statut='en_attente').count(),
                'approuve': queryset.filter(statut='approuve').count(),
                'rejete': queryset.filter(statut='rejete').count(),
                'montant_total': queryset.aggregate(Sum('montant_genere'))['montant_genere__sum'] or 0,
            }
            
            # CALCUL DES STATISTIQUES DÉTAILLÉES PAR SUCCURSALE
            succursale_stats = {}
            for application in queryset:
                succursale = application.get_succursale_display()
                
                if succursale not in succursale_stats:
                    succursale_stats[succursale] = {
                        'total': 0,
                        'en_attente': 0,
                        'approuve': 0,
                        'rejete': 0
                    }
                
                # Incrémenter les compteurs
                succursale_stats[succursale]['total'] += 1
                succursale_stats[succursale][application.statut] += 1
            
            # Déterminer le type de rapport basé sur le statut sélectionné
            report_type = "RECUES" if data.get('statut') == 'recues' or not data.get('statut') else data.get('statut', '').upper()
            
            return Response({
                'statistiques': stats,
                'succursale_stats': succursale_stats,  # NOUVEAU: statistiques détaillées
                'report_type': report_type,  # Type de rapport pour l'affichage
                'periode': {
                    'debut': data['date_debut'],
                    'fin': data['date_fin']
                },
                'filtres_appliques': {
                    'statut': data.get('statut', ''),
                    'type_application': data.get('type_application', ''),
                    'succursale': data.get('succursale', '')
                }
            })
        return Response(serializer.errors, status=400)
    
    # Export CSV avec meilleur encodage
    @action(detail=False, methods=['post'])
    def export_csv(self, request):
        serializer = ReportSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            
            # Filtrer les applications (même logique que generate_report)
            queryset = CreditApplication.objects.filter(
                date_saisie__date__range=[data['date_debut'], data['date_fin']]
            )
            
            if data.get('succursale'):
                queryset = queryset.filter(succursale=data['succursale'])
            if data.get('type_application'):
                queryset = queryset.filter(type_dossier=data['type_application'])
            
            # Gestion spéciale pour le statut "recues"
            if data.get('statut') and data.get('statut') != 'recues':
                queryset = queryset.filter(statut=data['statut'])
            
            if data.get('officer'):
                queryset = queryset.filter(officer_credit_id=data['officer'])
            
            # Calcul des statistiques détaillées par succursale
            succursale_stats = {}
            for application in queryset:
                succursale = application.get_succursale_display()
                
                if succursale not in succursale_stats:
                    succursale_stats[succursale] = {
                        'total': 0,
                        'en_attente': 0,
                        'approuve': 0,
                        'rejete': 0
                    }
                
                succursale_stats[succursale]['total'] += 1
                succursale_stats[succursale][application.statut] += 1
            
            # Préparer la réponse CSV avec bon encodage
            response = HttpResponse(content_type='text/csv; charset=utf-8-sig')  # charset utf-8-sig pour Excel
            filename = f"rapport_{data['date_debut']}_{data['date_fin']}.csv"
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            
            # Écrire le contenu CSV manuellement pour mieux contrôler l'encodage
            content = []
            
            # DÉTERMINER LE TITRE SELON LE STATUT
            report_title = "APPLICATIONS RECUES"
            if data.get('statut') == 'en_attente':
                report_title = "APPLICATIONS EN ATTENTE"
            elif data.get('statut') == 'approuve':
                report_title = "APPLICATIONS APPROUVEES"
            elif data.get('statut') == 'rejete':
                report_title = "APPLICATIONS REJETEES"
            
            content.append(report_title)
            content.append(f"Du: {data['date_debut']} Au: {data['date_fin']}")
            content.append("")
            content.append("STATISTIQUES GLOBALES PAR SUCCURSALE")
            content.append("")
            content.append("Succursale,Total,Rejetées,En attente,Traitées")
            
            # Données des succursales
            for succursale, stats in succursale_stats.items():
                traitees = stats['approuve']  # Traitées = approuvées
                line = f"{succursale.upper()},{stats['total']},{stats['rejete']},{stats['en_attente']},{traitees}"
                content.append(line)
            
            # Total général
            total_global = queryset.count()
            total_rejete = queryset.filter(statut='rejete').count()
            total_attente = queryset.filter(statut='en_attente').count()
            total_traite = queryset.filter(statut='approuve').count()
            
            content.append("")
            content.append(f"TOTAL GENERAL,{total_global},{total_rejete},{total_attente},{total_traite}")
            
            # Écrire le contenu avec encodage UTF-8 avec BOM
            response.write(codecs.BOM_UTF8)
            response.write("\n".join(content))
            
            return response
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