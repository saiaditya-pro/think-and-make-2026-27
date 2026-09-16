from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.inquibuddy.models import InquibuddySubmission
from apps.teams.models import Team


@receiver(post_save, sender=Team)
def create_inquibuddy_submission(sender, instance: Team, created, **kwargs):
    if created:
        InquibuddySubmission.objects.get_or_create(team=instance)
