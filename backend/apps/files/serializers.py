from rest_framework import serializers

from apps.files.models import File


class FileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = ["id", "url", "mime_type", "size", "entity_type", "entity_id", "created_at"]

    def get_url(self, obj: File) -> str:
        request = self.context.get("request")
        url = obj.file.url
        return request.build_absolute_uri(url) if request else url


class FileUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ["id", "file", "entity_type", "entity_id"]
