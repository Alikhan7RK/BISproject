from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "email", "role", "nutritionist", "is_active", "date_joined"]
    list_filter = ["role", "is_active", "preferred_language"]
    search_fields = ["username", "email", "first_name", "last_name"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("NutriScan", {"fields": ("role", "preferred_language", "nutritionist", "avatar", "bio")}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ("NutriScan", {"fields": ("role", "preferred_language")}),
    )
