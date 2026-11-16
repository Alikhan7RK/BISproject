from django.contrib import admin

from .models import Dish, DishCategory, Meal, NutritionGoal, Recommendation


@admin.register(DishCategory)
class DishCategoryAdmin(admin.ModelAdmin):
    list_display = ["name_en", "name_ru", "name_kk"]
    search_fields = ["name_en", "name_ru", "name_kk"]


@admin.register(Dish)
class DishAdmin(admin.ModelAdmin):
    list_display = ["name_en", "category", "ml_label", "calories", "protein", "fat", "carbs"]
    list_filter = ["category"]
    search_fields = ["search_index"]

    def get_search_results(self, request, queryset, search_term):
        # search_index is stored lowercase, so lowercase the term too (works for Cyrillic)
        return super().get_search_results(request, queryset, search_term.lower())


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ["user", "dish", "meal_type", "portion_grams", "ai_confidence", "eaten_at"]
    list_filter = ["meal_type", "eaten_at"]
    search_fields = ["user__username", "dish__name_en", "note"]
    date_hierarchy = "eaten_at"
    autocomplete_fields = ["dish"]


@admin.register(NutritionGoal)
class NutritionGoalAdmin(admin.ModelAdmin):
    list_display = ["user", "goal_type", "daily_calories", "updated_at"]
    list_filter = ["goal_type"]
    search_fields = ["user__username"]


@admin.register(Recommendation)
class RecommendationAdmin(admin.ModelAdmin):
    list_display = ["title", "nutritionist", "client", "is_read", "created_at"]
    list_filter = ["is_read"]
    search_fields = ["title", "text", "client__username", "nutritionist__username"]
