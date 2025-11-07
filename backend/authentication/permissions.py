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

class IsOwnerOrManager(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'manager':
            return True
        return obj.created_by == request.user or obj.officer_credit == request.user

class CanModifyApplication(permissions.BasePermission):
    """
    Permission personnalisée pour la modification des dossiers
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        
        # Managers peuvent modifier tous les dossiers
        if user.role == 'manager':
            return True
        
        # Officiers peuvent modifier seulement leurs dossiers assignés
        if user.role == 'officer':
            return obj.officer_credit == user
        
        # Secrétaires NE PEUVENT PAS modifier les dossiers
        if user.role == 'secretary':
            return False
        
        return False