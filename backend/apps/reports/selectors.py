"""Read-only aggregations for the dashboard's KPI row, following the same
plain-function style as ``apps.observations.selectors``."""

from apps.schools.models import School
from apps.sl_selection.models import SLSelection


def compute_kpis(progress_qs) -> dict:
    """``progress_qs`` is the (already role-scoped) SchoolProgress queryset
    backing the summary endpoint -- callers only invoke this for admin/iif_staff
    requests, where it's unfiltered, so ``total_schools`` and the queryset agree."""
    total_schools = School.objects.count()
    if total_schools == 0:
        return {"schools_enrolled": 0, "forms_completed_pct": 0, "kits_delivered": 0, "active_student_leaders": 0}

    forms_completed = progress_qs.filter(
        form1_status="complete",
        form2_status="complete",
        form3_pct=100,
        form4_pct=100,
        kit_status="complete",
    ).count()

    return {
        "schools_enrolled": total_schools,
        "forms_completed_pct": round(forms_completed / total_schools * 100),
        "kits_delivered": progress_qs.filter(kit_status="complete").count(),
        "active_student_leaders": SLSelection.objects.filter(sl_status="selected").count(),
    }
