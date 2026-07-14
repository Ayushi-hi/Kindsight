"""
Run the trained model on a single image, outside of the API - useful for
quick sanity checks after training, before wiring it into the backend.

Usage:
    python predict.py --checkpoint ../saved_models/efficientnet_b0_pneumonia.pt --image path/to/scan.png
"""

import argparse

import timm
import torch
from PIL import Image
from torchvision import transforms

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def load_model(checkpoint_path: str, device):
    model = timm.create_model("efficientnet_b0", pretrained=False, num_classes=1)
    state_dict = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()
    return model


def preprocess(image_path: str, image_size: int = 224):
    transform = transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.Grayscale(num_output_channels=3),
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ]
    )
    image = Image.open(image_path).convert("RGB")
    return transform(image).unsqueeze(0)


def predict(checkpoint_path: str, image_path: str):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = load_model(checkpoint_path, device)
    tensor = preprocess(image_path).to(device)

    with torch.no_grad():
        logit = model(tensor)
        prob = torch.sigmoid(logit).item()

    label = "pneumonia" if prob >= 0.5 else "normal"
    confidence = prob if label == "pneumonia" else 1 - prob
    print(f"Prediction: {label} (confidence: {confidence:.3f}, raw pneumonia probability: {prob:.3f})")
    return label, confidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--image", type=str, required=True)
    args = parser.parse_args()

    predict(args.checkpoint, args.image)
