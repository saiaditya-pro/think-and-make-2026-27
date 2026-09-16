from apps.core.permissions import SCHOOL, scope_queryset_to_role


class SchoolScopedViewSetMixin:
    """
    Shared behaviour for the "school form" viewsets (kits, sl_selection,
    headcounts, teams, observations, inquibuddy): a school account can only
    ever see and write its own school's rows, and can never set a different
    school on create -- both enforced server-side, never trusting the
    request body/query params.
    """

    school_field = "school"

    def get_queryset(self):
        return scope_queryset_to_role(super().get_queryset(), self.request, school_field=self.school_field)

    def perform_create(self, serializer):
        if self.request.user.role == SCHOOL:
            serializer.save(**{self.school_field: self.request.user.school})
        else:
            serializer.save()
