from rest_framework.permissions import BasePermission


class IsNutritionist(BasePermission):
    message = "Only nutritionists can do this."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_nutritionist)
