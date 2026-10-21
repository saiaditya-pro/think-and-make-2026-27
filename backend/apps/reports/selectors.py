"""Read-only aggregations for the dashboard's KPI row, following the same
plain-function style as ``apps.observations.selectors``."""

from apps.schools.models import School
from apps.sl_selection.models import SLSelection


def compute_kpis(progress_qs, partner_id: int | None = None) -> dict:
    """``progress_qs`` is the (already role-scoped) SchoolProgress queryset
    backing the summary endpoint -- callers only invoke this for admin/iif_staff
    requests, where it's unfiltered apart from ``partner_id``, which is applied
    to the school/SL counts too so they agree with the queryset."""
    schools = School.objects.all()
    sl_selections = SLSelection.objects.filter(sl_status="selected")
    if partner_id is not None:
        schools = schools.filter(instance__partner_id=partner_id)
        sl_selections = sl_selections.filter(school__instance__partner_id=partner_id)
    total_schools = schools.count()
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
        "active_student_leaders": sl_selections.count(),
    }
