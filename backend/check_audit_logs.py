#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from authentication.models import AuditLog
import json

logs = AuditLog.objects.all().values('id', 'user__username', 'action', 'status', 'timestamp', 'ip_address', 'resource_type', 'resource_id')
logs_list = list(logs)
print(json.dumps(logs_list, ensure_ascii=False, indent=2, default=str))
print(f"\nTotal logs: {len(logs_list)}")
