"""
Augmentations for chest X-ray training.

Deliberately conservative: no horizontal flip. Chest X-rays have anatomical
laterality (heart on the left, etc.) - flipping can teach the model on
mirror-image anatomy that doesn't occur in real patients, which is a subtle
but real mistake specific to medical imaging (unlike natural image tasks
where flipping is usually safe).
"""

import albumentations as A
from albumentations.pytorch import ToTensorV2

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def get_train_transforms(image_size: int = 224):
    return A.Compose(
        [
            A.Rotate(limit=10, p=0.5),
            A.RandomBrightnessContrast(brightness_limit=0.15, contrast_limit=0.15, p=0.5),
            A.GaussNoise(var_limit=(5.0, 20.0), p=0.2),
            A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
            ToTensorV2(),
        ]
    )


def get_eval_transforms(image_size: int = 224):
    return A.Compose(
        [
            A.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
            ToTensorV2(),
        ]
    )
