from rest_framework import serializers

from apps.teams.models import Cluster, Student, Team


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ["id", "team", "name"]


class TeamSerializer(serializers.ModelSerializer):
    students = StudentSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ["id", "cluster", "team_code", "sl_name", "students"]


class ClusterSerializer(serializers.ModelSerializer):
    teams = TeamSerializer(many=True, read_only=True)

    class Meta:
        model = Cluster
        fields = ["id", "school", "grade", "section", "cluster_number", "teams"]
