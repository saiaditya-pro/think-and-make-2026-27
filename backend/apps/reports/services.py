"""
Reconciliation logic behind the School Progress Dashboard.

Every value here is re-derived from the four existing form tables
(School, StudentHeadcount, SLSelection, KitDelivery) -- ``reconcile_school``
can be re-run at any time and will converge to the same answer, which is
what makes it safe to run both nightly (``reconcile_all_schools``, via the
Celery beat schedule) and synchronously for a single section right after a
Form 3 submit (``reconcile_section``).
"""

import logging

from apps.reports.models import SchoolProgress

logger = logging.getLogger(__name__)

GRADE_KIT_FIELDS = {6: "grade_6_kit", 7: "grade_7_kit", 8: "grade_8_kit", 9: "grade_9_kit"}


def _normalize_section(section: str) -> str:
    return section.strip().upper()


def _sl_counts_by_grade_section(school) -> dict[tuple[int, str], int]:
    """{(grade, normalized_section): number of SLSelection rows}."""
    counts: dict[tuple[int, str], int] = {}
    for grade, section in school.sl_selections.values_list("grade", "section"):
        key = (grade, _normalize_section(section))
        counts[key] = counts.get(key, 0) + 1
    return counts


def check_headcount_mismatch(headcount, sl_counts: dict[tuple[int, str], int] | None = None) -> dict | None:
    """
    Compares one StudentHeadcount row's ``total_sl`` against the actual count
    of SLSelection rows for the same grade/section. Also keeps the headcount's
    own (previously unused) ``count_validation`` field in sync, so the
    mismatch is visible in Django admin / the existing
    ``?count_validation=mismatch`` filter too, not just on the dashboard.

    Returns the flag dict for ``SchoolProgress.mismatch_flags`` if the counts
    disagree, or None if they agree -- or if Form 4 hasn't been started yet
    for this grade/section at all (nothing to compare against means no
    mismatch, just "not started").
    """
    if sl_counts is None:
        sl_counts = _sl_counts_by_grade_section(headcount.school)

    key = (headcount.grade, _normalize_section(headcount.section))
    sl_count = sl_counts.get(key)

    if sl_count is None or sl_count == headcount.total_sl:
        if headcount.count_validation == "mismatch":
            headcount.count_validation = "ok"
            headcount.save(update_fields=["count_validation"])
        return None

    if headcount.count_validation != "mismatch":
        headcount.count_validation = "mismatch"
        headcount.save(update_fields=["count_validation"])
    return {
        "grade": headcount.grade,
        "section": headcount.section,
        "total_sl": headcount.total_sl,
        "sl_selection_count": sl_count,
    }


def _form_status(submitted: bool, has_partial_data: bool) -> str:
    if submitted:
        return "complete"
    if has_partial_data:
        return "in_progress"
    return "not_started"


def _compute_kit_status(school) -> str:
    if not school.grades_offered:
        return "not_started"
    offered_grades = [int(g) for g in school.grades_offered.split(",") if g.strip()]

    latest_kit = school.kit_deliveries.first()  # KitDelivery.Meta.ordering = ["-date_of_delivery"]
    if latest_kit is None:
        return "not_started"

    delivered = [getattr(latest_kit, GRADE_KIT_FIELDS[g]) for g in offered_grades if g in GRADE_KIT_FIELDS]
    if not delivered or not any(delivered):
        return "not_started"
    if all(delivered):
        return "complete"
    return "in_progress"


def reconcile_school(school) -> SchoolProgress:
    grade_enrollments = list(school.grade_enrollments.all())
    denom = sum(ge.total_sections for ge in grade_enrollments)

    headcounts = list(school.student_headcounts.all())
    sl_counts = _sl_counts_by_grade_section(school)

    form3_pct = min(round(len(headcounts) / denom * 100), 100) if denom else 0
    form4_pct = min(round(len(sl_counts) / denom * 100), 100) if denom else 0

    mismatch_flags = [
        flag for hc in headcounts if (flag := check_headcount_mismatch(hc, sl_counts)) is not None
    ]

    progress, _ = SchoolProgress.objects.update_or_create(
        school=school,
        defaults={
            "form1_status": _form_status(
                school.form1_submitted, bool(school.visited_by) or bool(grade_enrollments)
            ),
            "form2_status": _form_status(
                school.form2_submitted, school.teachers.exists() or school.session_schedules.exists()
            ),
            "form3_pct": form3_pct,
            "form4_pct": form4_pct,
            "kit_status": _compute_kit_status(school),
            "mismatch_flags": mismatch_flags,
        },
    )
    return progress


def reconcile_section(school, grade: int, section: str) -> dict | None:
    """
    Narrower, synchronous version of the mismatch check for exactly one
    grade/section -- used right after a Form 3 submit so the warning banner
    doesn't wait for the nightly job. Does not touch the rest of the
    school's SchoolProgress row.
    """
    from apps.headcounts.models import StudentHeadcount

    try:
        headcount = school.student_headcounts.get(grade=grade, section=section)
    except StudentHeadcount.DoesNotExist:
        return None
    return check_headcount_mismatch(headcount)


def reconcile_all_schools() -> None:
    """The nightly Celery task's entry point (also used by the
    ``reconcile_school_progress`` management command for a manual run)."""
    from apps.schools.models import School

    schools = School.objects.prefetch_related(
        "grade_enrollments", "teachers", "session_schedules", "student_headcounts", "sl_selections", "kit_deliveries"
    )
    for school in schools:
        try:
            reconcile_school(school)
        except Exception:
            logger.exception("Failed to reconcile SchoolProgress for school %s", school.pk)
