from django.utils import timezone
from rest_framework import serializers

from accounts.serializers import PublicNutritionistSerializer

from .models import Dish, DishCategory, Meal, NutritionGoal, Recommendation


class ClientSerializer(PublicNutritionistSerializer):
    """A nutritionist's client: public profile + today's calories and their daily goal."""

    today_calories = serializers.SerializerMethodField()
    daily_calories = serializers.SerializerMethodField()

    class Meta(PublicNutritionistSerializer.Meta):
        fields = PublicNutritionistSerializer.Meta.fields + ["today_calories", "daily_calories"]

    def get_today_calories(self, user):
        meals = Meal.objects.filter(user=user, eaten_at__date=timezone.localdate()).select_related("dish")
        return round(sum(m.calories for m in meals))

    def get_daily_calories(self, user):
        goal, _ = NutritionGoal.objects.get_or_create(user=user)
        return goal.daily_calories


class DishCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DishCategory
        fields = ["id", "name_en", "name_ru", "name_kk"]


class DishSerializer(serializers.ModelSerializer):
    category = DishCategorySerializer(read_only=True)

    class Meta:
        model = Dish
        fields = [
            "id", "category", "name_en", "name_ru", "name_kk", "ml_label",
            "calories", "protein", "fat", "carbs", "default_portion_grams", "image",
        ]


class MealSerializer(serializers.ModelSerializer):
    dish_detail = DishSerializer(source="dish", read_only=True)
    calories = serializers.FloatField(read_only=True)
    protein = serializers.FloatField(read_only=True)
    fat = serializers.FloatField(read_only=True)
    carbs = serializers.FloatField(read_only=True)

    class Meta:
        model = Meal
        fields = [
            "id", "dish", "dish_detail", "meal_type", "portion_grams", "photo",
            "ai_confidence", "note", "eaten_at", "created_at",
            "calories", "protein", "fat", "carbs",
        ]
        read_only_fields = ["id", "created_at"]


class NutritionGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = NutritionGoal
        fields = [
            "goal_type", "daily_calories", "daily_protein", "daily_fat",
            "daily_carbs", "weight_kg", "updated_at",
        ]
        read_only_fields = ["updated_at"]


class RecommendationSerializer(serializers.ModelSerializer):
    nutritionist_name = serializers.CharField(source="nutritionist.username", read_only=True)
    client_name = serializers.CharField(source="client.username", read_only=True)

    class Meta:
        model = Recommendation
        fields = [
            "id", "nutritionist", "nutritionist_name", "client", "client_name",
            "title", "text", "is_read", "created_at",
        ]
        read_only_fields = ["id", "nutritionist", "created_at"]

    def validate_client(self, client):
        request = self.context["request"]
        if client.nutritionist_id != request.user.id:
            raise serializers.ValidationError("You can only write recommendations for your own clients.")
        return client
