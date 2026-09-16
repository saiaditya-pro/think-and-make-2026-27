from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.files.models import File
from apps.files.serializers import FileSerializer, FileUploadSerializer


class FileViewSet(mixins.CreateModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Generic upload endpoint used by forms that need a standalone file first
    (school photo, kit delivery proof, acknowledgement letter, teams-info
    photo, student database) before attaching its id to the parent record.
    InquiBuddy's own photo/audio uploads go through
    inquibuddy-submissions/{id}/upload-photo|audio/ instead, which links the
    file to a submission in one call.
    """

    queryset = File.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return FileUploadSerializer if self.action == "create" else FileSerializer

    def perform_create(self, serializer):
        uploaded = self.request.FILES["file"]
        serializer.save(uploaded_by=self.request.user, mime_type=uploaded.content_type or "", size=uploaded.size)
