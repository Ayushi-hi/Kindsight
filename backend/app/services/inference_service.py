"""
Handles pneumonia classification.

Runs in mock mode by default (USE_MOCK_MODEL=true in .env) so the rest of the
stack (upload -> predict -> report -> chat -> frontend) can be built and
tested before the EfficientNet model is trained. Flip the flag once you have
a real .pt weights file and this same interface keeps working.
"""

import os
import random
import time
from app.core.config import settings

_model = None
_temperature = None


def _load_real_model():
    """Loads the trained EfficientNet-B0 checkpoint. Only called if
    USE_MOCK_MODEL is false — keeps torch import lazy so mock mode doesn't
    require torch to even be installed correctly."""
    import torch
    import timm

    model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=1)
    state_dict = torch.load(settings.model_path, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    return model


def _load_temperature() -> float:
    """Loads the fitted calibration temperature if available (see
    ml/training/calibrate.py). Falls back to 1.0 (no-op, uncalibrated
    behavior) if the file doesn't exist - calibration is purely additive,
    never required."""
    temp_path = settings.model_path.replace(".pt", "_temperature.txt")
    if os.path.exists(temp_path):
        with open(temp_path) as f:
            return float(f.read().strip())
    return 1.0


def get_model():
    global _model
    if _model is None and not settings.use_mock_model:
        _model = _load_real_model()
    return _model


def get_temperature() -> float:
    global _temperature
    if _temperature is None:
        _temperature = _load_temperature()
    return _temperature


def preprocess_image(image_path: str):
    import torchvision.transforms as T
    from app.services.image_utils import load_image_as_pil

    transform = T.Compose(
        [
            T.Resize((224, 224)),
            T.Grayscale(num_output_channels=3),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    image = load_image_as_pil(image_path)
    return transform(image).unsqueeze(0)


def predict_pneumonia(image_path: str) -> dict:
    """Returns { label, confidence, inference_time_ms }"""
    start = time.time()

    if settings.use_mock_model:
        # Deterministic-ish mock: biased toward interesting demo results
        confidence = round(random.uniform(0.62, 0.97), 3)
        label = "pneumonia" if confidence > 0.5 and random.random() > 0.35 else "normal"
        if label == "normal":
            confidence = round(random.uniform(0.70, 0.95), 3)
        elapsed_ms = int((time.time() - start) * 1000) + random.randint(80, 200)
        return {"label": label, "confidence": confidence, "inference_time_ms": elapsed_ms}

    import torch

    model = get_model()
    temperature = get_temperature()
    tensor = preprocess_image(image_path)
    with torch.no_grad():
        logit = model(tensor)
        # Temperature scaling: dividing the logit by T before sigmoid
        # rescales confidence without changing which class wins - a
        # calibrated 73% is genuinely more trustworthy than a raw,
        # uncalibrated 73% from the same model.
        prob = torch.sigmoid(logit / temperature).item()

    label = "pneumonia" if prob >= 0.5 else "normal"
    confidence = prob if label == "pneumonia" else 1 - prob
    elapsed_ms = int((time.time() - start) * 1000)

    return {"label": label, "confidence": round(confidence, 3), "inference_time_ms": elapsed_ms}