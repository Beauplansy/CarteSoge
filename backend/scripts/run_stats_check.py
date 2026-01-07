import os
import json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()
from authentication.models import AuditLog
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

def run():
    today = timezone.now().date()
    last_7 = timezone.now() - timedelta(days=7)
    out = {}
    out['total_logs'] = AuditLog.objects.count()
    out['logs_today'] = AuditLog.objects.filter(timestamp__date=today).count()
    out['logs_last_7_days'] = AuditLog.objects.filter(timestamp__gte=last_7).count()
    out['failed_actions'] = AuditLog.objects.filter(status='failed').count()
    out['actions_by_type'] = list(AuditLog.objects.values('action').annotate(count=Count('id')).order_by().values_list('action','count'))
    out['logins_today'] = list(AuditLog.objects.filter(action='login', timestamp__date=today, status='success').values('user__username').annotate(count=Count('id')).order_by().values('user__username','count'))
    print(json.dumps(out, ensure_ascii=False, indent=2))

if __name__ == '__main__':
    run()
