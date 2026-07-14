"""
Shared image loading so both inference and Grad-CAM handle DICOM (.dcm) the
same way as standard image formats (PNG/JPG). PIL alone cannot read DICOM -
this was a real bug: uploading a raw .dcm file (which the upload endpoint
explicitly accepts) crashed both prediction and Grad-CAM generation.
"""

import os

import numpy as np
from PIL import Image


def load_image_as_pil(image_path: str) -> Image.Image:
    """Loads an image file (DICOM, PNG, or JPG) and returns a PIL Image in RGB mode."""
    ext = os.path.splitext(image_path)[1].lower()

    if ext == ".dcm":
        import pydicom

        dcm = pydicom.dcmread(image_path)
        arr = dcm.pixel_array.astype(np.float32)

        # Normalize to 0-255 regardless of the DICOM's native bit depth
        arr = arr - arr.min()
        max_val = arr.max()
        if max_val > 0:
            arr = arr / max_val
        arr = (arr * 255).astype(np.uint8)

        return Image.fromarray(arr).convert("RGB")

    return Image.open(image_path).convert("RGB")


def save_viewable_preview(image_path: str, output_path: str) -> str:
    """Saves a browser-viewable PNG copy of any supported image (including
    DICOM). Needed because raw .dcm files can be uploaded and processed
    fine server-side, but browsers cannot render them directly in an <img>
    tag - so the frontend's "original image" view needs this PNG copy
    instead of linking straight to the uploaded file."""
    image = load_image_as_pil(image_path)
    image.save(output_path)
    return output_path