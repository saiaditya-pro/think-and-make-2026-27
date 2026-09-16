from rest_framework import serializers

from apps.programs.models import Partner, ProgramInstance


class PartnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partner
        fields = ["id", "name"]


class ProgramInstanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgramInstance
        fields = ["id", "code", "label", "partner", "year", "is_active"]
