from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.models import User
from apps.accounts.serializers import (
    ThinkAndMakeTokenObtainPairSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from apps.core.audit import record_audit
from apps.core.permissions import IsAdmin


class LoginView(TokenObtainPairView):
    """POST {username, password} -> {access, refresh}. Rate-limited to guard
    against brute-forcing the old short/shared PIN-style credentials."""

    serializer_class = ThinkAndMakeTokenObtainPairSerializer
    throttle_scope = "login"


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """Admin-only account management -- replaces hand-editing the Users sheet."""

    queryset = User.objects.all().order_by("username")
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        return UserCreateSerializer if self.action == "create" else UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        record_audit(user=self.request.user, action="create_user", entity_type="User", entity_id=user.id)

    def perform_update(self, serializer):
        before = UserSerializer(serializer.instance).data
        user = serializer.save()
        record_audit(
            user=self.request.user, action="update_user", entity_type="User", entity_id=user.id,
            before=before, after=UserSerializer(user).data,
        )
