from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import SCHOOL, scope_queryset_to_role
from apps.reports import selectors
from apps.reports.models import SchoolProgress
from apps.reports.serializers import SchoolProgressSerializer


class ReportsSummaryView(APIView):
    """
    Backs the dashboard's KPI row + school-progress table -- replaces having
    to query the database by hand to answer "how are we doing, across every
    school". A school-role request gets back just its own row and no KPIs
    (an aggregate across schools it can't see wouldn't mean anything to it).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = scope_queryset_to_role(
            SchoolProgress.objects.select_related("school"), request, school_field="school_id"
        )
        partner_param = request.query_params.get("partner")
        partner_id = None
        if partner_param:
            if not partner_param.isdigit():
                raise ValidationError({"partner": "Must be a partner id."})
            partner_id = int(partner_param)
            qs = qs.filter(school__instance__partner_id=partner_id)
        kpis = None if request.user.role == SCHOOL else selectors.compute_kpis(qs, partner_id)
        return Response({"kpis": kpis, "schools": SchoolProgressSerializer(qs, many=True).data})
