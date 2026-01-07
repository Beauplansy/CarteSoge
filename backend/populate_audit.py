#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import User, AuditLog
from django.utils import timezone

user = User.objects.get(username='test_manager')
AuditLog.objects.create(
    user=user,
    action='login',
    status='success',
    ip_address='127.0.0.1',
    resource_type='auth',
    timestamp=timezone.now()
)
print('AuditLog created successfully')
