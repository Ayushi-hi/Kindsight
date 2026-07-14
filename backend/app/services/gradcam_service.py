"""
Generates a Grad-CAM heatmap overlay for a given scan + prediction.
Mock mode returns the original image unmodified (with a note in the filename)
so the frontend flow can be built before the real model exists.
"""

import os
from app.core.config import settings


def generate_gradcam(image_path: str, scan_id: str, label: str) -> str:
    output_dir = os.path.join(settings.upload_dir, "gradcam")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{scan_id}_gradcam.png")

    if settings.use_mock_model:
        # Mock: save a viewable PNG of the original image as a placeholder
        # "heatmap". Previously this just shutil.copy'd the source file, which
        # broke for .dcm uploads since browsers can't render raw DICOM - the
        # frontend would get a gradcam_url pointing at a file it can't display.
        from app.services.image_utils import load_image_as_pil

        image = load_image_as_pil(image_path)
        image.save(output_path)
        return output_path

    import numpy as np
    import cv2
    from pytorch_grad_cam import GradCAM
    from pytorch_grad_cam.utils.image import show_cam_on_image
    from app.services.inference_service import get_model, preprocess_image
    from app.services.image_utils import load_image_as_pil

    model = get_model()
    target_layer = model.conv_head  # last conv block in EfficientNet-B0 (timm)

    tensor = preprocess_image(image_path)
    cam = GradCAM(model=model, target_layers=[target_layer])
    grayscale_cam = cam(input_tensor=tensor)[0]

    # Use the same DICOM-aware loader as inference, instead of cv2.imread
    # directly - cv2.imread returns None for .dcm files, which used to crash
    # Grad-CAM generation whenever the uploaded scan was a raw DICOM file.
    pil_img = load_image_as_pil(image_path).resize((224, 224))
    rgb_img = np.array(pil_img).astype(np.float32) / 255.0

    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
    cv2.imwrite(output_path, cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))

    return output_path


class _ClassifierOutputTarget:
    """Selects a single class's logit as the target for Grad-CAM, so the
    heatmap shows what the model attended to for THAT specific condition -
    not just whatever the top overall prediction happens to be."""

    def __init__(self, category: int):
        self.category = category

    def __call__(self, model_output):
        return model_output[self.category]


def generate_gradcam_for_condition(image_path: str, scan_id: str, condition: str, class_idx: int) -> str:
    """Generates one Grad-CAM heatmap for a SPECIFIC condition, using the
    multi-label model. Filename includes the condition name so multiple
    findings on the same scan each get their own distinct file."""
    output_dir = os.path.join(settings.upload_dir, "gradcam")
    os.makedirs(output_dir, exist_ok=True)
    safe_condition = condition.lower().replace(" ", "_")
    output_path = os.path.join(output_dir, f"{scan_id}_{safe_condition}_gradcam.png")

    import numpy as np
    import cv2
    from pytorch_grad_cam import GradCAM
    from pytorch_grad_cam.utils.image import show_cam_on_image
    from app.services.multilabel_inference_service import get_model
    from app.services.image_utils import load_image_as_pil
    import torchvision.transforms as T

    model = get_model()
    target_layer = model.conv_head

    transform = T.Compose(
        [
            T.Resize((224, 224)),
            T.Grayscale(num_output_channels=3),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    pil_img = load_image_as_pil(image_path)
    tensor = transform(pil_img).unsqueeze(0)

    cam = GradCAM(model=model, target_layers=[target_layer])
    grayscale_cam = cam(input_tensor=tensor, targets=[_ClassifierOutputTarget(class_idx)])[0]

    display_img = pil_img.resize((224, 224))
    rgb_img = np.array(display_img).astype(np.float32) / 255.0

    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
    cv2.imwrite(output_path, cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))

    return output_path