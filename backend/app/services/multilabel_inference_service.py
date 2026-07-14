"""
Multi-label inference for the 14 NIH ChestX-ray14 conditions.

This is deliberately a SEPARATE service from inference_service.py (the
original single-disease pneumonia model), not a replacement - both can
exist side by side. Which one the API actually uses is controlled by
USE_MULTILABEL_MODEL in settings, so the existing pneumonia-only pipeline
keeps working unchanged unless this is explicitly turned on.

Condition order MUST match exactly what the model was trained with
(ml/training/dataset_multilabel.py's CONDITIONS list) - this is the single
most important thing to keep in sync between training and inference.
"""

from app.core.config import settings

CONDITIONS = [
    "Atelectasis",
    "Cardiomegaly",
    "Effusion",
    "Infiltration",
    "Mass",
    "Nodule",
    "Pneumonia",
    "Pneumothorax",
    "Consolidation",
    "Edema",
    "Emphysema",
    "Fibrosis",
    "Pleural_Thickening",
    "Hernia",
]

# Using a uniform 0.5 threshold for every condition is a known simplification.
# Per-class thresholds tuned on the validation set (e.g. via Youden's J
# statistic per class) would be a meaningful next improvement - especially
# for rare conditions like Hernia, where the "right" threshold is unlikely
# to be exactly 0.5. Flagged here rather than silently assumed correct.
DEFAULT_THRESHOLD = 0.5

_model = None


def _load_model():
    import torch
    import timm

    model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=len(CONDITIONS))
    state_dict = torch.load(settings.multilabel_model_path, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    return model


def get_model():
    global _model
    if _model is None:
        _model = _load_model()
    return _model


def predict_multilabel(image_path: str) -> dict:
    """Returns:
    {
        "findings": [{"condition": "Cardiomegaly", "confidence": 0.82}, ...],  # positives only, sorted
        "all_probabilities": {condition: prob, ...}  # all 14, for transparency/debugging
    }
    An empty "findings" list is a valid, meaningful result - it means no
    condition crossed its threshold, not that something failed.
    """
    import torch
    from app.services.image_utils import load_image_as_pil
    import torchvision.transforms as T

    transform = T.Compose(
        [
            T.Resize((224, 224)),
            T.Grayscale(num_output_channels=3),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    image = load_image_as_pil(image_path)
    tensor = transform(image).unsqueeze(0)

    model = get_model()
    with torch.no_grad():
        logits = model(tensor)
        probs = torch.sigmoid(logits)[0].tolist()

    all_probabilities = {condition: round(prob, 4) for condition, prob in zip(CONDITIONS, probs)}

    findings = [
        {"condition": condition, "confidence": round(prob, 4)}
        for condition, prob in zip(CONDITIONS, probs)
        if prob >= DEFAULT_THRESHOLD
    ]
    findings.sort(key=lambda f: f["confidence"], reverse=True)

    return {"findings": findings, "all_probabilities": all_probabilities}