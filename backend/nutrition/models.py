from django.conf import settings
from django.db import models


class DishCategory(models.Model):
    name_en = models.CharField(max_length=100)
    name_ru = models.CharField(max_length=100, blank=True)
    name_kk = models.CharField(max_length=100, blank=True)

    class Meta:
        verbose_name_plural = "dish categories"
        ordering = ["name_en"]

    def __str__(self):
        return self.name_en


class Dish(models.Model):
    """A food the app knows. Nutrition values are per 100 g."""

    category = models.ForeignKey(DishCategory, on_delete=models.PROTECT, related_name="dishes")
    name_en = models.CharField(max_length=150)
    name_ru = models.CharField(max_length=150, blank=True)
    name_kk = models.CharField(max_length=150, blank=True)
    # Class name the ML model predicts (e.g. "pizza"). Links predictions to this dish.
    ml_label = models.CharField(max_length=100, unique=True, null=True, blank=True)
    calories = models.DecimalField(max_digits=6, decimal_places=1, help_text="kcal per 100 g")
    protein = models.DecimalField(max_digits=5, decimal_places=1, default=0, help_text="g per 100 g")
    fat = models.DecimalField(max_digits=5, decimal_places=1, default=0, help_text="g per 100 g")
    carbs = models.DecimalField(max_digits=5, decimal_places=1, default=0, help_text="g per 100 g")
    default_portion_grams = models.PositiveIntegerField(default=250)
    image = models.ImageField(upload_to="dishes/", blank=True, null=True)
    # All names in lowercase, filled automatically. SQLite only ignores case for
    # Latin letters, so search uses this field to also match "пицца" for "Пицца".
    search_index = models.TextField(blank=True, editable=False)

    class Meta:
        verbose_name_plural = "dishes"
        ordering = ["name_en"]

    def save(self, *args, **kwargs):
        names = [self.name_en, self.name_ru, self.name_kk, self.ml_label or ""]
        self.search_index = " ".join(n.lower() for n in names if n)
        # update_or_create() saves only the fields it was given (update_fields),
        # so add search_index to that list, otherwise a renamed dish keeps the old index.
        if kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = {*kwargs["update_fields"], "search_index"}
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name_en


class NutritionGoal(models.Model):
    class GoalType(models.TextChoices):
        LOSE = "lose", "Lose weight"
        KEEP = "keep", "Keep weight"
        GAIN = "gain", "Gain weight"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="goal")
    goal_type = models.CharField(max_length=10, choices=GoalType.choices, default=GoalType.KEEP)
    daily_calories = models.PositiveIntegerField(default=2000)
    daily_protein = models.PositiveIntegerField(default=100, help_text="g")
    daily_fat = models.PositiveIntegerField(default=70, help_text="g")
    daily_carbs = models.PositiveIntegerField(default=250, help_text="g")
    weight_kg = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}: {self.get_goal_type_display()} ({self.daily_calories} kcal)"


class Meal(models.Model):
    """One eaten meal. Created after the user confirms the AI prediction (or picks a dish manually)."""

    class MealType(models.TextChoices):
        BREAKFAST = "breakfast", "Breakfast"
        LUNCH = "lunch", "Lunch"
        DINNER = "dinner", "Dinner"
        SNACK = "snack", "Snack"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="meals")
    dish = models.ForeignKey(Dish, on_delete=models.PROTECT, related_name="meals")
    meal_type = models.CharField(max_length=10, choices=MealType.choices, default=MealType.LUNCH)
    portion_grams = models.PositiveIntegerField(default=250)
    photo = models.ImageField(upload_to="meals/", blank=True, null=True)
    # Confidence of the AI prediction (0..1). Empty when the dish was chosen manually.
    ai_confidence = models.FloatField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)
    eaten_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-eaten_at"]

    def _scaled(self, per_100g):
        return round(float(per_100g) * self.portion_grams / 100, 1)

    @property
    def calories(self):
        return self._scaled(self.dish.calories)

    @property
    def protein(self):
        return self._scaled(self.dish.protein)

    @property
    def fat(self):
        return self._scaled(self.dish.fat)

    @property
    def carbs(self):
        return self._scaled(self.dish.carbs)

    def __str__(self):
        return f"{self.user.username}: {self.dish} ({self.eaten_at:%Y-%m-%d})"


class Recommendation(models.Model):
    """Advice a nutritionist writes for one of their clients."""

    nutritionist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendations_written"
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendations"
    )
    title = models.CharField(max_length=150)
    text = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} → {self.client.username}"
