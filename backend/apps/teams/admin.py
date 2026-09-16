from django.contrib import admin

from apps.teams.models import Cluster, Student, Team

admin.site.register(Cluster)
admin.site.register(Team)
admin.site.register(Student)
