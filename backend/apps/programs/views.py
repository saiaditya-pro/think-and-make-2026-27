from rest_framework import viewsets

from apps.core.permissions import IsAdminOrIIFStaff
from apps.programs.models import Partner, ProgramInstance
from apps.programs.serializers import PartnerSerializer, ProgramInstanceSerializer


class PartnerViewSet(viewsets.ModelViewSet):
    queryset = Partner.objects.all()
    serializer_class = PartnerSerializer
    permission_classes = [IsAdminOrIIFStaff]


class ProgramInstanceViewSet(viewsets.ModelViewSet):
    queryset = ProgramInstance.objects.select_related("partner").all()
    serializer_class = ProgramInstanceSerializer
    permission_classes = [IsAdminOrIIFStaff]
