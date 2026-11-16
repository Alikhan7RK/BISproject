from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """App user. The role decides what the person can do in the app."""

    class Role(models.TextChoices):
        USER = "user", "User"
        NUTRITIONIST = "nutritionist", "Nutritionist"
        ADMIN = "admin", "Admin"

    class Language(models.TextChoices):
        EN = "en", "English"
        RU = "ru", "Русский"
        KK = "kk", "Қазақша"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.USER)
    preferred_language = models.CharField(
        max_length=2, choices=Language.choices, default=Language.EN
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    bio = models.TextField(blank=True)
    # A regular user can have one nutritionist who sees their meal log.
    nutritionist = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="clients",
        limit_choices_to={"role": Role.NUTRITIONIST},
    )

    @property
    def is_nutritionist(self) -> bool:
        return self.role == self.Role.NUTRITIONIST

    def save(self, *args, **kwargs):
        # Admin role and Django staff access go together.
        if self.role == self.Role.ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.username} ({self.role})"
