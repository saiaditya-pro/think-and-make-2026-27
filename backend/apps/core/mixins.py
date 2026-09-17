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

    def get_serializer(self, *args, **kwargs):
        # For models with a unique-together constraint including `school` (e.g. StudentHeadcount's
        # school+grade+section), DRF's UniqueTogetherValidator forces the field to be present in the
        # input *before* validation runs -- perform_create() setting it afterwards is too late. Inject
        # it into the incoming data here instead, so a school-role client can still omit it entirely.
        if self.request.user.is_authenticated and self.request.user.role == SCHOOL and "data" in kwargs:
            data = kwargs["data"]
            data = data.copy() if hasattr(data, "copy") else dict(data)
            data[self.school_field] = self.request.user.school_id
            kwargs["data"] = data
        return super().get_serializer(*args, **kwargs)

    def perform_create(self, serializer):
        if self.request.user.role == SCHOOL:
            serializer.save(**{self.school_field: self.request.user.school})
        else:
            serializer.save()
