from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from nutrition.models import Dish
from nutrition.serializers import DishSerializer

from .predictor import FoodPredictor, ModelNotReady

MAX_UPLOAD_BYTES = 8 * 1024 * 1024


class RecognizeMealView(APIView):
    """
    POST /api/ml/recognize/  (multipart, field "photo")

    Returns the top-3 predictions. Each prediction includes the matching Dish
    (by Dish.ml_label) so the frontend can show calories right away.
    Nothing is saved here: the user confirms first, then the frontend calls POST /api/meals/.
    """

    parser_classes = [MultiPartParser]

    def post(self, request):
        photo = request.FILES.get("photo")
        if photo is None:
            return Response({"detail": "Send an image in the 'photo' field."}, status=status.HTTP_400_BAD_REQUEST)
        if photo.size > MAX_UPLOAD_BYTES:
            return Response({"detail": "Image is too large (max 8 MB)."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            predictor = FoodPredictor.get()
        except ModelNotReady as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            predictions = predictor.predict(photo)
        except Exception:
            return Response({"detail": "Could not read the image."}, status=status.HTTP_400_BAD_REQUEST)

        dishes = {d.ml_label: d for d in Dish.objects.filter(ml_label__in=[p["label"] for p in predictions])}
        ctx = {"request": request}
        for p in predictions:
            dish = dishes.get(p["label"])
            p["dish"] = DishSerializer(dish, context=ctx).data if dish else None
        return Response({"predictions": predictions})


class ModelStatusView(APIView):
    """GET /api/ml/status/ - is the model loaded and ready?"""

    def get(self, request):
        try:
            predictor = FoodPredictor.get()
            return Response({"ready": True, "classes": len(predictor.classes)})
        except ModelNotReady as exc:
            return Response({"ready": False, "detail": str(exc)})
