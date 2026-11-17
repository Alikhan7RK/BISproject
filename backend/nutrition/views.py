from datetime import date, timedelta

from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsNutritionist
from accounts.serializers import PublicNutritionistSerializer

from .models import Dish, DishCategory, Meal, NutritionGoal, Recommendation
from .serializers import (
    ClientSerializer,
    DishCategorySerializer,
    DishSerializer,
    MealSerializer,
    NutritionGoalSerializer,
    RecommendationSerializer,
)


class DishCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DishCategory.objects.all()
    serializer_class = DishCategorySerializer
    pagination_class = None


def _term(request) -> str:
    return request.query_params.get("search", "").strip().lower()


class DishViewSet(viewsets.ReadOnlyModelViewSet):
    """Dish catalog (?search=, ?category=). Dishes are created and edited in the admin panel."""

    serializer_class = DishSerializer
    filterset_fields = ["category"]
    ordering_fields = ["name_en", "calories"]

    def get_queryset(self):
        qs = Dish.objects.select_related("category")
        if term := _term(self.request):
            qs = qs.filter(search_index__contains=term)
        return qs


MAX_WEEKLY_DAYS = 31  # upper limit for ?days= (weekly chart, client meals)


def _days_param(request, default=7) -> int:
    """Reads ?days=N (1..MAX_WEEKLY_DAYS). Not a number -> 400."""
    try:
        days = int(request.query_params.get("days", default))
    except ValueError:
        raise ValidationError({"detail": "days must be a number."})
    return max(1, min(days, MAX_WEEKLY_DAYS))


class MealViewSet(viewsets.ModelViewSet):
    """The logged-in user's own meals (?search=, ?date=YYYY-MM-DD, ?meal_type=)."""

    serializer_class = MealSerializer
    filterset_fields = ["meal_type", "dish"]
    ordering_fields = ["eaten_at"]

    def get_queryset(self):
        qs = Meal.objects.filter(user=self.request.user).select_related("dish", "dish__category")
        day = self.request.query_params.get("date")
        if day:
            qs = qs.filter(eaten_at__date=day)
        if term := _term(self.request):
            qs = qs.filter(Q(dish__search_index__contains=term) | Q(note__icontains=term))
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Totals for one day (?date=YYYY-MM-DD, default today) compared to the user's goal."""
        day = request.query_params.get("date") or date.today().isoformat()
        meals = Meal.objects.filter(user=request.user, eaten_at__date=day).select_related("dish")
        totals = {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0}
        for meal in meals:
            for key in totals:
                totals[key] += getattr(meal, key)
        goal, _ = NutritionGoal.objects.get_or_create(user=request.user)
        return Response({
            "date": day,
            "meals_count": meals.count(),
            "totals": {k: round(v, 1) for k, v in totals.items()},
            "goal": NutritionGoalSerializer(goal).data,
        })

    @action(detail=False, methods=["get"])
    def weekly(self, request):
        """Calories per day for the last N days (?days=7, max 31), oldest first. Days without meals = 0."""
        days = _days_param(request)
        today = timezone.localdate()  # today in the project time zone (Asia/Almaty)
        start = today - timedelta(days=days - 1)
        per_day = {start + timedelta(days=i): 0.0 for i in range(days)}  # every day starts at 0

        meals = Meal.objects.filter(user=request.user, eaten_at__date__gte=start).select_related("dish")
        for meal in meals:
            day = timezone.localdate(meal.eaten_at)
            if day in per_day:  # skip meals logged in the future
                per_day[day] += meal.calories

        goal, _ = NutritionGoal.objects.get_or_create(user=request.user)
        return Response([
            {"date": day.isoformat(), "calories": round(kcal), "goal": goal.daily_calories}
            for day, kcal in per_day.items()
        ])


class MyGoalView(generics.RetrieveUpdateAPIView):
    serializer_class = NutritionGoalSerializer

    def get_object(self):
        goal, _ = NutritionGoal.objects.get_or_create(user=self.request.user)
        return goal


class RecommendationViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet
):
    """Users see recommendations written for them; nutritionists see and write their own."""

    serializer_class = RecommendationSerializer
    search_fields = ["title", "text"]
    filterset_fields = ["client"]  # ?client=<id>: a nutritionist's recommendations for one client

    def get_queryset(self):
        user = self.request.user
        qs = Recommendation.objects.select_related("nutritionist", "client")
        if user.is_nutritionist:
            return qs.filter(nutritionist=user)
        return qs.filter(client=user)

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsNutritionist()]
        return super().get_permissions()

    def perform_create(self, serializer):
        serializer.save(nutritionist=self.request.user)

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        rec = self.get_object()
        if rec.client_id == request.user.id:
            rec.is_read = True
            rec.save(update_fields=["is_read"])
        return Response(self.get_serializer(rec).data)


def my_clients(nutritionist):
    """The ONLY place that decides who is a nutritionist's client. Every client view starts here."""
    return User.objects.filter(nutritionist=nutritionist)


class ClientListView(generics.ListAPIView):
    """Nutritionist: list of my clients with today's calories vs goal."""

    permission_classes = [permissions.IsAuthenticated, IsNutritionist]
    serializer_class = ClientSerializer
    search_fields = ["username", "first_name", "last_name"]

    def get_queryset(self):
        return my_clients(self.request.user).order_by("username")


class ClientDetailView(generics.RetrieveAPIView):
    """Nutritionist: one of my clients. Someone else's client -> 404."""

    permission_classes = [permissions.IsAuthenticated, IsNutritionist]
    serializer_class = ClientSerializer
    lookup_url_kwarg = "client_id"

    def get_queryset(self):
        return my_clients(self.request.user)


class ClientMealsView(generics.ListAPIView):
    """Nutritionist: meals of one of my clients for the last N days (?days=7), newest first, no paging."""

    permission_classes = [permissions.IsAuthenticated, IsNutritionist]
    serializer_class = MealSerializer
    pagination_class = None  # a week of meals is small; the page groups them by day

    def get_queryset(self):
        # 404 (not an empty list) if this user is not my client
        client = get_object_or_404(my_clients(self.request.user), pk=self.kwargs["client_id"])
        start = timezone.localdate() - timedelta(days=_days_param(self.request) - 1)
        return Meal.objects.filter(user=client, eaten_at__date__gte=start).select_related("dish", "dish__category")


class GlobalSearchView(APIView):
    """One search box for 3 entity types: dishes, my meals, nutritionists. ?q=..."""

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        if len(q) < 2:
            return Response({"dishes": [], "meals": [], "nutritionists": []})
        term = q.lower()
        dishes = Dish.objects.filter(search_index__contains=term).select_related("category")[:10]
        meals = Meal.objects.filter(user=request.user).filter(
            Q(dish__search_index__contains=term) | Q(note__icontains=q)
        ).select_related("dish", "dish__category")[:10]
        nutritionists = User.objects.filter(role=User.Role.NUTRITIONIST).filter(
            Q(username__icontains=q) | Q(first_name__icontains=q) | Q(last_name__icontains=q)
        )[:10]
        ctx = {"request": request}
        return Response({
            "dishes": DishSerializer(dishes, many=True, context=ctx).data,
            "meals": MealSerializer(meals, many=True, context=ctx).data,
            "nutritionists": PublicNutritionistSerializer(nutritionists, many=True, context=ctx).data,
        })
