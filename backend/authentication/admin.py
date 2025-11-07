"""from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, UserProfile, LoginHistory

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_active', 'date_joined', 'first_login')
    list_filter = ('role', 'is_active', 'is_staff', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = UserAdmin.fieldsets + (
        ('Informations SOGE CREDIT', {
            'fields': ('phone', 'role', 'first_login', 'last_activity')
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations SOGE CREDIT', {
            'fields': ('email', 'phone', 'role', 'first_login')
        }),
    )

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'city', 'country', 'created_at')
    search_fields = ('user__username', 'city', 'country')
    list_filter = ('country', 'created_at')

@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    list_display = ('user', 'login_time', 'ip_address')
    list_filter = ('login_time',)
    search_fields = ('user__username', 'ip_address')
    readonly_fields = ('login_time',)

    def has_add_permission(self, request):
        return False"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'branch', 'is_active', 'date_joined')
    list_filter = ('role', 'branch', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Informations SogeApp', {
            'fields': ('role', 'branch', 'phone')
        }),
    )
    
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations SogeApp', {
            'fields': ('role', 'branch', 'phone')
        }),
    )