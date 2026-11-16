from rest_framework import generics, permissions

from .models import User
from .serializers import PublicNutritionistSerializer, RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """GET / PATCH the logged-in user's profile."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class NutritionistListView(generics.ListAPIView):
    serializer_class = PublicNutritionistSerializer
    queryset = User.objects.filter(role=User.Role.NUTRITIONIST, is_active=True).order_by("username")
    search_fields = ["username", "first_name", "last_name", "bio"]
