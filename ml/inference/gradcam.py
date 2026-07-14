"""
Generates and displays/saves a Grad-CAM heatmap for a single image - use this
right after training to sanity-check that the model is actually looking at
plausible lung regions, not e.g. text overlays, scanner artifacts, or image
borders. If the heatmap consistently lights up outside the lungs, that's a
sign of a data or preprocessing problem, not something to fix by tuning
hyperparameters.

Usage:
    python gradcam.py --checkpoint ../saved_models/efficientnet_b0_pneumonia.pt --image path/to/scan.png --output heatmap.png
"""

import argparse

import cv2
import numpy as np
import timm
import torch
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image

from predict import IMAGENET_MEAN, IMAGENET_STD, load_model, preprocess


def generate_gradcam(checkpoint_path: str, image_path: str, output_path: str, image_size: int = 224):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = load_model(checkpoint_path, device)

    target_layer = model.conv_head  # last conv block before pooling, in timm's EfficientNet

    tensor = preprocess(image_path, image_size).to(device)

    cam = GradCAM(model=model, target_layers=[target_layer])
    grayscale_cam = cam(input_tensor=tensor)[0]

    rgb_img = cv2.imread(image_path)
    rgb_img = cv2.resize(rgb_img, (image_size, image_size))
    rgb_img = cv2.cvtColor(rgb_img, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0

    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
    cv2.imwrite(output_path, cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))
    print(f"Saved Grad-CAM heatmap to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", type=str, required=True)
    parser.add_argument("--image", type=str, required=True)
    parser.add_argument("--output", type=str, default="gradcam_output.png")
    args = parser.parse_args()

    generate_gradcam(args.checkpoint, args.image, args.output)
