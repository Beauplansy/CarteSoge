from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Configuration du router DRF
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='users')
router.register(r'applications', views.CreditApplicationViewSet, basename='applications')
router.register(r'notifications', views.NotificationViewSet, basename='notifications')
router.register(r'reports', views.ReportViewSet, basename='reports')

urlpatterns = [
    # Routes API DRF
    path('', include(router.urls)),
    
    # Route de login
    path('login/', views.AuthViewSet.as_view({'post': 'login'}), name='login'),
    path('logout/', views.AuthViewSet.as_view({'post': 'logout'}), name='logout'),
    
    # Dashboard stats
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
]