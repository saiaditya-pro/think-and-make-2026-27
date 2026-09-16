"""
Read-only aggregations that replace the old sheet's manually "auto-filled"
pivot tabs. These are plain querysets over SessionObservation -- there is no
Tracker/Progress table to keep in sync.
"""

from django.db.models import Count

from apps.observations.models import SessionObservation


def session_tracker(unit: int, grade: int):
    """Mirrors 'L{unit}_Session_Tracker_G{grade}': one row per school x section,
    showing which session numbers have been observed."""
    return (
        SessionObservation.objects.filter(unit=unit, grade=grade)
        .values("school_id", "school__school_code", "section", "session_no", "date", "observed_by")
        .order_by("school__school_code", "section", "session_no")
    )


def session_progress():
    """Mirrors 'Session_Progress': count of completed sessions per school x unit."""
    return (
        SessionObservation.objects.values("school_id", "school__school_code", "unit")
        .annotate(sessions_completed=Count("id"))
        .order_by("school__school_code", "unit")
    )
