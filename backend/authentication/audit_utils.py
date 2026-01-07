"""
Utilitaires pour enregistrer les logs d'audit dans le système
"""
from .models import AuditLog
from django.utils import timezone


def log_audit(request, action, resource_type='', resource_id='', resource_display='', 
              changes=None, status='success', error_message=''):
    """
    Enregistre une action d'audit dans la base de données
    
    Args:
        request: L'objet HttpRequest
        action: Type d'action (login, logout, create_app, update_app, etc)
        resource_type: Type de ressource affectée (CreditApplication, User, etc)
        resource_id: ID de la ressource affectée
        resource_display: Description lisible de la ressource
        changes: Dict des changements effectués
        status: 'success' ou 'failed'
        error_message: Message d'erreur en cas d'échec
    """
    try:
        # Extraire l'IP address
        ip_address = get_client_ip(request)
        
        # Extraire le User-Agent
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]
        
        # Créer le log d'audit
        audit_log = AuditLog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else '',
            resource_display=resource_display[:200] if resource_display else '',
            ip_address=ip_address,
            user_agent=user_agent,
            changes=changes or {},
            status=status,
            error_message=error_message[:500] if error_message else ''
        )
        
        return audit_log
    except Exception as e:
        # Silencieusement échouer si l'audit ne peut pas être enregistré
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Erreur lors de l'enregistrement de l'audit: {str(e)}")
        return None


def get_client_ip(request):
    """
    Extrait l'adresse IP du client à partir de la requête
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_login_audit(request, user):
    """Enregistre une connexion réussie"""
    return log_audit(
        request=request,
        action='login',
        resource_type='User',
        resource_id=user.id,
        resource_display=f"{user.get_full_name()} ({user.username})",
        status='success'
    )


def log_login_failed_audit(request, username):
    """Enregistre une tentative de connexion échouée"""
    return log_audit(
        request=request,
        action='login',
        resource_type='User',
        resource_display=f"Tentative avec username: {username}",
        status='failed',
        error_message="Identifiants invalides"
    )


def log_logout_audit(request):
    """Enregistre une déconnexion"""
    if request.user.is_authenticated:
        return log_audit(
            request=request,
            action='logout',
            resource_type='User',
            resource_id=request.user.id,
            resource_display=f"{request.user.get_full_name()} ({request.user.username})",
            status='success'
        )
    return None


def log_application_audit(request, action, application, changes=None):
    """Enregistre une action sur une application de crédit"""
    return log_audit(
        request=request,
        action=action,
        resource_type='CreditApplication',
        resource_id=application.id,
        resource_display=f"{application.application_id} - {application.nom_client} {application.prenom_client}",
        changes=changes or {},
        status='success'
    )


def log_user_audit(request, action, user, changes=None):
    """Enregistre une action sur un utilisateur"""
    return log_audit(
        request=request,
        action=action,
        resource_type='User',
        resource_id=user.id,
        resource_display=f"{user.get_full_name()} ({user.username})",
        changes=changes or {},
        status='success'
    )
