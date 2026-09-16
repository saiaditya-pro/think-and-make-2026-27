from rest_framework import serializers

from apps.kits.models import KitDelivery


class KitDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = KitDelivery
        fields = [
            "id", "school", "delivered_by", "received_by", "date_of_delivery",
            "grade_6_kit", "grade_7_kit", "grade_8_kit", "grade_9_kit",
            "delivery_proof_photo", "acknowledgement_letter",
        ]
        extra_kwargs = {"school": {"required": False}}
