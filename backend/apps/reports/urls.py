from django.urls import path

from apps.reports.views import ReportsSummaryView

urlpatterns = [
    path("reports/summary/", ReportsSummaryView.as_view(), name="reports-summary"),
]
