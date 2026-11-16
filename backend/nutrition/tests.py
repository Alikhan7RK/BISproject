from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from nutrition.models import Dish, Meal


class ApiSmokeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_demo", verbosity=0)

    def login(self, username, password):
        client = APIClient()
        res = client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
        self.assertEqual(res.status_code, 200, res.content)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
        return client

    def test_register_creates_regular_user(self):
        res = APIClient().post(
            "/api/auth/register/",
            {"username": "new", "password": "strongpass123", "role": "admin"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(User.objects.get(username="new").role, User.Role.USER)

    def test_api_requires_login(self):
        self.assertEqual(APIClient().get("/api/meals/").status_code, 401)

    def test_dish_search(self):
        client = self.login("demo", "demo12345")
        for term in ["Пицца", "пиц", "PIZZA"]:
            res = client.get("/api/dishes/", {"search": term})
            self.assertEqual(res.data["results"][0]["ml_label"], "pizza", term)

    def test_create_meal_and_summary(self):
        client = self.login("demo", "demo12345")
        pizza = Dish.objects.get(ml_label="pizza")
        res = client.post(
            "/api/meals/",
            {"dish": pizza.id, "portion_grams": 100, "meal_type": "dinner", "eaten_at": timezone.now().isoformat()},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(res.data["calories"], 266.0)
        summary = client.get("/api/meals/summary/").data
        self.assertGreaterEqual(summary["totals"]["calories"], 266.0)

    def test_users_only_see_own_meals(self):
        other = User.objects.create_user("other", password="strongpass123")
        Meal.objects.create(user=other, dish=Dish.objects.first(), eaten_at=timezone.now())
        client = self.login("demo", "demo12345")
        ids = [m["id"] for m in client.get("/api/meals/").data["results"]]
        self.assertFalse(Meal.objects.filter(id__in=ids, user=other).exists())

    def test_global_search_returns_three_types(self):
        client = self.login("demo", "demo12345")
        res = client.get("/api/search/", {"q": "nu"})
        self.assertEqual(set(res.data), {"dishes", "meals", "nutritionists"})
        self.assertEqual(res.data["nutritionists"][0]["username"], "nutri")

    def test_only_nutritionist_can_write_recommendation(self):
        demo = User.objects.get(username="demo")
        user_client = self.login("demo", "demo12345")
        payload = {"client": demo.id, "title": "Hi", "text": "Eat more fiber"}
        self.assertEqual(user_client.post("/api/recommendations/", payload, format="json").status_code, 403)
        nutri_client = self.login("nutri", "nutri12345")
        self.assertEqual(nutri_client.post("/api/recommendations/", payload, format="json").status_code, 201)

    def test_recognize_maps_predictions_to_dishes(self):
        """Fake model: checks the endpoint links predicted labels to Dish rows."""
        from unittest import mock

        from django.core.files.uploadedfile import SimpleUploadedFile

        fake = mock.Mock()
        fake.predict.return_value = [
            {"label": "pizza", "confidence": 0.92},
            {"label": "unknown_food", "confidence": 0.05},
        ]
        client = self.login("demo", "demo12345")
        photo = SimpleUploadedFile("x.jpg", b"img", content_type="image/jpeg")
        with mock.patch("ml.views.FoodPredictor.get", return_value=fake):
            res = client.post("/api/ml/recognize/", {"photo": photo}, format="multipart")
        self.assertEqual(res.status_code, 200)
        first, second = res.data["predictions"]
        self.assertEqual(first["dish"]["name_en"], "Pizza")
        self.assertIsNone(second["dish"])

    def test_recognize_without_model_returns_503(self):
        client = self.login("demo", "demo12345")
        from unittest import mock

        from django.core.files.uploadedfile import SimpleUploadedFile

        from ml.predictor import ModelNotReady

        photo = SimpleUploadedFile("x.jpg", b"not-really-an-image", content_type="image/jpeg")
        # Pretend the weights are missing, so the test gives the same result
        # on a machine with a trained model and on one without it.
        with mock.patch("ml.views.FoodPredictor.get", side_effect=ModelNotReady("no weights")):
            res = client.post("/api/ml/recognize/", {"photo": photo}, format="multipart")
        self.assertEqual(res.status_code, 503)

    def test_seed_renames_dish_and_updates_search(self):
        # seed_demo renamed "Pancakes" -> "Pancakes (thick)" / "Панкейки"; search must follow the new names
        client = self.login("demo", "demo12345")
        labels = lambda term: {d["ml_label"] for d in client.get("/api/dishes/", {"search": term}).data["results"]}
        Dish.objects.filter(ml_label="pancakes").update(name_ru="Блины", search_index="pancakes блины")
        call_command("seed_demo", verbosity=0)
        self.assertEqual(labels("панкейк"), {"pancakes"})
        self.assertEqual(labels("блины"), {"blini"})
        self.assertEqual(labels("плов"), {"plov"})
