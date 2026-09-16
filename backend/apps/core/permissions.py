from rest_framework.permissions import SAFE_METHODS, BasePermission

ADMIN = "admin"
IIF_STAFF = "iif_staff"
SCHOOL = "school"


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == ADMIN)


class IsAdminOrIIFStaff(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in (ADMIN, IIF_STAFF)
        )


class IsSchoolUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == SCHOOL)


class IsAdminOrIIFStaffOrReadOnly(BasePermission):
    """Admin/IIF staff can read and write; school accounts can only read
    (their own data is enforced separately via queryset scoping)."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in (ADMIN, IIF_STAFF)


def scope_queryset_to_role(queryset, request, school_field="school"):
    """
    Apply the program's RBAC rule server-side, never trusting a request's own
    filters: admin sees everything, iif_staff sees everything they're
    assigned to (currently: everything -- per-instance assignment can be
    layered on later), school sees only rows belonging to their own school.
    """
    user = request.user
    if user.role == SCHOOL:
        return queryset.filter(**{school_field: user.school_id})
    return queryset
