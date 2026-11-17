from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    ClientDetailView,
    ClientListView,
    ClientMealsView,
    DishCategoryViewSet,
    DishViewSet,
    GlobalSearchView,
    MealViewSet,
    MyGoalView,
    RecommendationViewSet,
)

router = DefaultRouter()
router.register("categories", DishCategoryViewSet, basename="category")
router.register("dishes", DishViewSet, basename="dish")
router.register("meals", MealViewSet, basename="meal")
router.register("recommendations", RecommendationViewSet, basename="recommendation")

urlpatterns = [
    path("goal/", MyGoalView.as_view(), name="my-goal"),
    path("search/", GlobalSearchView.as_view(), name="global-search"),
    path("clients/", ClientListView.as_view(), name="clients"),
    path("clients/<int:client_id>/", ClientDetailView.as_view(), name="client-detail"),
    path("clients/<int:client_id>/meals/", ClientMealsView.as_view(), name="client-meals"),
] + router.urls
