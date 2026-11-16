from django.urls import path

from .views import ModelStatusView, RecognizeMealView

urlpatterns = [
    path("recognize/", RecognizeMealView.as_view(), name="ml-recognize"),
    path("status/", ModelStatusView.as_view(), name="ml-status"),
]
