from rest_framework import viewsets

from apps.core.permissions import IsAdminOrIIFStaffOrReadOnly
from apps.programs.models import Partner, ProgramInstance
from apps.programs.serializers import PartnerSerializer, ProgramInstanceSerializer


class PartnerViewSet(viewsets.ModelViewSet):
    """Read access is open to every authenticated role (including school)
    since every form's Partner->School picker needs to list partners;
    school accounts still can't write here."""

    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]


class ProgramInstanceViewSet(viewsets.ModelViewSet):
    queryset = ProgramInstance.objects.select_related("partner").all()
    serializer_class = ProgramInstanceSerializer
    permission_classes = [IsAdminOrIIFStaffOrReadOnly]
