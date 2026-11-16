from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "preferred_language", "avatar", "bio", "nutritionist",
        ]
        read_only_fields = ["id", "username", "role"]


class PublicNutritionistSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "avatar", "bio"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name", "preferred_language"]

    def create(self, validated_data):
        # Self-registration always creates a regular user; roles are set by an admin.
        return User.objects.create_user(**validated_data, role=User.Role.USER)
