from apps.core.models import AuditLog


def record_audit(*, user, action, entity_type, entity_id="", before=None, after=None):
    """Write one audit trail row. Call this from services/viewsets around
    sensitive mutations -- see accounts.services and inquibuddy.services."""
    AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        before=before,
        after=after,
    )
