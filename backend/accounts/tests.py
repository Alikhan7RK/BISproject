import io
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from .models import User

TEMP_MEDIA = tempfile.mkdtemp()  # uploaded avatars go here, not into the real media/ folder


def image_file(name, size, fmt):
    """A real image file in memory. BMP is uncompressed, so a big BMP is easily over 2 MB."""
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 100, 50)).save(buf, fmt)
    return SimpleUploadedFile(name, buf.getvalue(), content_type=f"image/{fmt.lower()}")


@override_settings(MEDIA_ROOT=TEMP_MEDIA)
class ProfileTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user("anna", password="strongpass123")
        cls.other_user = User.objects.create_user("bob", password="strongpass123")
        cls.nutri = User.objects.create_user("nutri", password="strongpass123", role=User.Role.NUTRITIONIST)

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(TEMP_MEDIA, ignore_errors=True)

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_nutritionist_must_have_nutritionist_role(self):
        client = self.client_for(self.user)
        res = client.patch("/api/auth/me/", {"nutritionist": self.other_user.id}, format="json")
        self.assertEqual(res.status_code, 400)
        self.assertIn("nutritionist", res.data)

        res = client.patch("/api/auth/me/", {"nutritionist": self.nutri.id}, format="json")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["nutritionist_detail"]["username"], "nutri")

    def test_nutritionist_cannot_choose_a_nutritionist(self):
        other_nutri = User.objects.create_user("nutri2", password="strongpass123", role=User.Role.NUTRITIONIST)
        res = self.client_for(self.nutri).patch("/api/auth/me/", {"nutritionist": other_nutri.id}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_edit_profile_with_avatar(self):
        client = self.client_for(self.user)
        res = client.patch(
            "/api/auth/me/",
            {"first_name": "Anna", "bio": "Hi", "preferred_language": "kk",
             "avatar": image_file("me.png", (64, 64), "PNG")},
            format="multipart",
        )
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["first_name"], "Anna")
        self.assertEqual(res.data["preferred_language"], "kk")
        self.assertIn("/media/avatars/", res.data["avatar"])

    def test_avatar_must_be_an_image(self):
        fake = SimpleUploadedFile("me.png", b"this is not an image", content_type="image/png")
        res = self.client_for(self.user).patch("/api/auth/me/", {"avatar": fake}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertIn("avatar", res.data)

    def test_avatar_max_2_mb(self):
        big = image_file("big.bmp", (1000, 1000), "BMP")  # ~3 MB
        self.assertGreater(big.size, 2 * 1024 * 1024)
        res = self.client_for(self.user).patch("/api/auth/me/", {"avatar": big}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertIn("2 MB", str(res.data["avatar"]))
