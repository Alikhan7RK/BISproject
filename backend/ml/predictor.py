"""
Food recognition predictor.

The model is trained in Google Colab (ml/notebooks/train_food_model.ipynb).
Colab exports two files that go into backend/ml/weights/:
    food_model.pth  - trained weights (state_dict)
    classes.json    - class names in the SAME order as during training

The architecture and preprocessing below MUST match the notebook exactly,
otherwise predictions will be wrong.

torch is imported lazily so the rest of the backend works even before
torch is installed or the model is trained.
"""

import json
import threading

from django.conf import settings

IMAGE_SIZE = 224
MEAN = [0.485, 0.456, 0.406]  # ImageNet values, same as in Colab
STD = [0.229, 0.224, 0.225]


class ModelNotReady(Exception):
    """Raised when the weights are missing or torch is not installed."""


class FoodPredictor:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        try:
            import torch
            from torchvision import models, transforms
        except ImportError as exc:
            raise ModelNotReady(
                "PyTorch is not installed. Run: pip install -r requirements-ml.txt"
            ) from exc

        weights_dir = settings.ML_MODEL_DIR
        weights_path = weights_dir / "food_model.pth"
        classes_path = weights_dir / "classes.json"
        if not weights_path.exists() or not classes_path.exists():
            raise ModelNotReady(
                f"Model files not found in {weights_dir}. "
                "Train the model in Colab and copy food_model.pth and classes.json there."
            )

        self.torch = torch
        self.classes = json.loads(classes_path.read_text(encoding="utf-8"))

        # Same architecture as in the notebook: ResNet-18 with a new last layer.
        model = models.resnet18()
        model.fc = torch.nn.Linear(model.fc.in_features, len(self.classes))
        model.load_state_dict(torch.load(weights_path, map_location="cpu"))
        model.eval()
        self.model = model

        self.preprocess = transforms.Compose([
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(MEAN, STD),
        ])

    @classmethod
    def get(cls) -> "FoodPredictor":
        """Load the model once and reuse it for every request."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def predict(self, image_file, top_k: int = 3) -> list[dict]:
        from PIL import Image

        image = Image.open(image_file).convert("RGB")
        tensor = self.preprocess(image).unsqueeze(0)
        with self.torch.no_grad():
            probs = self.torch.softmax(self.model(tensor), dim=1)[0]
        values, indices = probs.topk(min(top_k, len(self.classes)))
        return [
            {"label": self.classes[i], "confidence": round(v.item(), 4)}
            for v, i in zip(values, indices)
        ]
