from rest_framework import permissions

class IsManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'manager'

class IsOfficer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'officer'

class IsSecretary(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'secretary'

class IsManagerOrOfficer(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['manager', 'officer']

class IsManagerOrSecretary(permissions.BasePermission):
    """Permission pour manager OU secrétaire"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['manager', 'secretary']

class IsOwnerOrManager(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'manager':
            return True
        return obj.created_by == request.user or obj.officer_credit == request.user

class CanModifyApplication(permissions.BasePermission):
    """
    Permission personnalisée pour la modification des dossiers.
    - Managers peuvent modifier tous les dossiers.
    - Officiers peuvent modifier seulement leurs dossiers assignés (si dossier a un officier assigné).
    - Secrétaires NE PEUVENT PAS modifier les dossiers.
    - Si un dossier n'a pas d'officier assigné, les officiers ne peuvent pas le modifier.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Managers peuvent modifier tous les dossiers
        if user.role == 'manager':
            return True
        
        # Officiers peuvent modifier seulement leurs dossiers assignés
        if user.role == 'officer':
            # Contrainte : si dossier n'a pas d'officier assigné, officier ne peut pas modifier
            if obj.officer_credit is None:
                return False
            # Officier doit être assigné à ce dossier
            return obj.officer_credit == user
        
        # Secrétaires NE PEUVENT PAS modifier les dossiers
        if user.role == 'secretary':
            return False
        
        return False