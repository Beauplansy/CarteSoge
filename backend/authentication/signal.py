# authentication/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import User

@receiver(post_save, sender=User)
def send_welcome_email(sender, instance, created, **kwargs):
    """
    Envoie un email de bienvenue aux nouveaux utilisateurs
    """
    if created and instance.email:
        try:
            send_mail(
                'Bienvenue sur SogeApp Credit',
                f'Bonjour {instance.first_name},\n\nVotre compte a été créé avec succès.\n\nCordialement,\nL\'équipe SogeApp Credit',
                settings.DEFAULT_FROM_EMAIL,
                [instance.email],
                fail_silently=True,
            )
        except Exception as e:
            # Log l'erreur mais ne bloque pas la création de l'utilisateur
            print(f"Erreur envoi email: {e}")