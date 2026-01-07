#!/usr/bin/env python
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from rest_framework.test import APIRequestFactory, force_authenticate
from authentication.views import AuditLogViewSet
from authentication.models import User

# Get test_manager
user = User.objects.get(username='test_manager')

# Create a request
factory = APIRequestFactory()
request = factory.get('/api/auth/audit_logs/')
force_authenticate(request, user=user)

# Call the viewset
view = AuditLogViewSet.as_view({'get': 'list'})
response = view(request)

print(f"Status: {response.status_code}")
print(f"Data:\n{json.dumps(response.data, indent=2, ensure_ascii=False, default=str)}")
