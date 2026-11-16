"""
python manage.py seed_demo

Creates demo users, dish categories and dishes whose ml_label matches the
model's class names (20 from Food-101 + 8 local dishes from the Central Asian
Food Dataset), plus a few meals. Safe to run more than once.
Nutrition values are approximate (per 100 g) - fine for a student demo.
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from nutrition.models import Dish, DishCategory, Meal, NutritionGoal, Recommendation

CATEGORIES = {
    "fast_food": ("Fast food", "Фастфуд", "Фастфуд"),
    "main": ("Main dishes", "Основные блюда", "Негізгі тағамдар"),
    "salad": ("Salads", "Салаты", "Салаттар"),
    "dessert": ("Desserts", "Десерты", "Десерттер"),
    "breakfast": ("Breakfast", "Завтрак", "Таңғы ас"),
    "kazakh": ("Kazakh & Central Asian", "Казахская и среднеазиатская кухня", "Қазақ және Орта Азия асханасы"),
}

# ml_label, category, en, ru, kk, kcal, protein, fat, carbs, portion
DISHES = [
    ("pizza", "fast_food", "Pizza", "Пицца", "Пицца", 266, 11, 10, 33, 200),
    ("hamburger", "fast_food", "Hamburger", "Гамбургер", "Гамбургер", 254, 13, 12, 24, 220),
    ("french_fries", "fast_food", "French fries", "Картофель фри", "Фри картобы", 312, 3.4, 15, 41, 150),
    ("hot_dog", "fast_food", "Hot dog", "Хот-дог", "Хот-дог", 290, 10, 18, 22, 150),
    ("sushi", "main", "Sushi", "Суши", "Суши", 150, 6, 1.5, 29, 200),
    ("ramen", "main", "Ramen", "Рамен", "Рамен", 110, 5, 4, 14, 450),
    ("fried_rice", "main", "Fried rice", "Жареный рис", "Қуырылған күріш", 163, 4.5, 6, 23, 300),
    ("dumplings", "main", "Dumplings", "Пельмени", "Тұшпара", 220, 11, 9, 24, 250),
    ("spaghetti_bolognese", "main", "Spaghetti bolognese", "Спагетти болоньезе", "Болоньезе спагеттиі", 150, 7, 5, 19, 350),
    ("chicken_curry", "main", "Chicken curry", "Курица карри", "Карри тауығы", 150, 12, 8, 7, 300),
    ("steak", "main", "Steak", "Стейк", "Стейк", 271, 25, 19, 0, 200),
    ("caesar_salad", "salad", "Caesar salad", "Салат Цезарь", "Цезарь салаты", 190, 7, 15, 7, 250),
    ("greek_salad", "salad", "Greek salad", "Греческий салат", "Грек салаты", 110, 3, 9, 5, 250),
    # "pancakes" = thick American ones (Food-101); thin blini are a separate dish below
    ("pancakes", "breakfast", "Pancakes (thick)", "Панкейки", "Панкейк", 227, 6, 10, 28, 150),
    ("omelette", "breakfast", "Omelette", "Омлет", "Омлет", 154, 11, 12, 1, 150),
    ("waffles", "breakfast", "Waffles", "Вафли", "Вафли", 291, 8, 14, 33, 100),
    ("ice_cream", "dessert", "Ice cream", "Мороженое", "Балмұздақ", 207, 3.5, 11, 24, 100),
    ("chocolate_cake", "dessert", "Chocolate cake", "Шоколадный торт", "Шоколад торты", 371, 5, 17, 50, 100),
    ("cheesecake", "dessert", "Cheesecake", "Чизкейк", "Чизкейк", 321, 5.5, 22, 26, 120),
    ("donuts", "dessert", "Donuts", "Пончики", "Пончиктер", 452, 5, 25, 51, 80),
    # Local dishes: not in Food-101, the model learns them from the Central Asian Food Dataset
    # (CAFD_CLASSES in the notebook - the ml_label here must be the same as the class name there)
    ("plov", "kazakh", "Plov", "Плов", "Палау", 200, 6, 9, 24, 300),
    ("shashlik", "kazakh", "Shashlik", "Шашлык", "Шашлық", 240, 20, 17, 1, 200),
    ("beshbarmak", "kazakh", "Beshbarmak", "Бешбармак", "Бешбармақ", 180, 11, 9, 14, 350),
    ("manty", "kazakh", "Manty", "Манты", "Мәнті", 230, 10, 11, 23, 250),
    ("lagman", "kazakh", "Lagman", "Лагман", "Лағман", 120, 6, 4, 15, 400),
    ("baursak", "kazakh", "Baursak", "Баурсаки", "Бауырсақ", 380, 7, 18, 47, 80),
    ("samsa", "kazakh", "Samsa", "Самса", "Самса", 300, 10, 17, 27, 120),
    ("doner", "kazakh", "Doner", "Донер", "Дөнер", 215, 11, 10, 20, 300),
    # Blini are NOT a model class yet (no dataset has them): users pick them manually in add-meal
    ("blini", "breakfast", "Blini (thin pancakes)", "Блины (тонкие)", "Жұқа құймақ", 220, 6, 8, 30, 150),
]

USERS = [
    # username, password, role
    ("admin", "admin12345", User.Role.ADMIN),
    ("nutri", "nutri12345", User.Role.NUTRITIONIST),
    ("demo", "demo12345", User.Role.USER),
]


class Command(BaseCommand):
    help = "Fill the database with demo data"

    def handle(self, *args, **options):
        cats = {}
        for key, (en, ru, kk) in CATEGORIES.items():
            cats[key], _ = DishCategory.objects.update_or_create(
                name_en=en, defaults={"name_ru": ru, "name_kk": kk}
            )

        for label, cat, en, ru, kk, kcal, p, f, c, portion in DISHES:
            Dish.objects.update_or_create(
                ml_label=label,
                defaults=dict(
                    category=cats[cat], name_en=en, name_ru=ru, name_kk=kk,
                    calories=kcal, protein=p, fat=f, carbs=c, default_portion_grams=portion,
                ),
            )

        users = {}
        for username, password, role in USERS:
            user, created = User.objects.get_or_create(username=username, defaults={"role": role})
            if created:
                user.set_password(password)
                if role == User.Role.ADMIN:
                    user.is_superuser = True
                user.save()
            users[username] = user

        demo, nutri = users["demo"], users["nutri"]
        demo.nutritionist = nutri
        demo.save()
        NutritionGoal.objects.get_or_create(user=demo, defaults={"goal_type": "lose", "daily_calories": 1900})

        if not Meal.objects.filter(user=demo).exists():
            now = timezone.now()
            for days_ago, label, meal_type in [
                (0, "omelette", "breakfast"), (0, "caesar_salad", "lunch"),
                (1, "pancakes", "breakfast"), (1, "ramen", "lunch"), (1, "steak", "dinner"),
                (2, "pizza", "lunch"), (2, "ice_cream", "snack"),
            ]:
                dish = Dish.objects.get(ml_label=label)
                Meal.objects.create(
                    user=demo, dish=dish, meal_type=meal_type,
                    portion_grams=dish.default_portion_grams,
                    eaten_at=now - timedelta(days=days_ago),
                )

        Recommendation.objects.get_or_create(
            nutritionist=nutri, client=demo, title="Less sugar this week",
            defaults={"text": "Try to replace desserts with fruit and add more protein at breakfast."},
        )

        self.stdout.write(self.style.SUCCESS(
            "Demo data ready. Logins: admin/admin12345, nutri/nutri12345, demo/demo12345"
        ))
