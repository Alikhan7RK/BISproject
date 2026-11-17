from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User

MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


class PublicNutritionistSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "avatar", "bio"]


class UserSerializer(serializers.ModelSerializer):
    # Name/avatar of the chosen nutritionist, so the profile page can show it (read only)
    nutritionist_detail = PublicNutritionistSerializer(source="nutritionist", read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "role", "preferred_language", "avatar", "bio", "nutritionist", "nutritionist_detail",
        ]
        read_only_fields = ["id", "username", "role"]

    def validate_nutritionist(self, value):
        if value is None:
            return value
        # Only regular users have a nutritionist
        if self.instance and self.instance.role != User.Role.USER:
            raise serializers.ValidationError("Only regular users can choose a nutritionist.")
        if value.role != User.Role.NUTRITIONIST or not value.is_active:
            raise serializers.ValidationError("This user is not a nutritionist.")
        return value

    def validate_avatar(self, value):
        # ImageField already checks that the file is a real image (Pillow can open it)
        if value and value.size > MAX_AVATAR_BYTES:
            raise serializers.ValidationError("The photo must be at most 2 MB.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["username", "email", "password", "first_name", "last_name", "preferred_language"]

    def create(self, validated_data):
        # Self-registration always creates a regular user; roles are set by an admin.
        return User.objects.create_user(**validated_data, role=User.Role.USER)
