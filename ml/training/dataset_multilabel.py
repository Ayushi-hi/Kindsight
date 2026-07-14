"""
Dataset for NIH ChestX-ray14 (multi-label version).

Expects:
  images_dir/  containing <Image Index>.png files
  labels_csv   NIH's sample_labels.csv, with columns including
               "Image Index" and "Finding Labels" (pipe-separated, or
               "No Finding" for normal cases)
"""

import os

import cv2
import numpy as np
import pandas as pd
from torch.utils.data import Dataset

# Fixed order matters - this defines which index in the output vector
# corresponds to which disease. Every part of the pipeline (training,
# inference, thresholds) must use this exact same order.
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


def load_labels(labels_csv: str) -> pd.DataFrame:
    """Returns a DataFrame with one row per image and one binary column per
    condition, parsed from NIH's pipe-separated 'Finding Labels' column."""
    df = pd.read_csv(labels_csv)

    for condition in CONDITIONS:
        df[condition] = df["Finding Labels"].apply(
            lambda labels, c=condition: 1 if c in str(labels).split("|") else 0
        )

    return df[["Image Index"] + CONDITIONS]


class ChestXray14Dataset(Dataset):
    def __init__(self, image_ids, label_matrix, images_dir: str, image_size: int = 224, transform=None):
        self.image_ids = list(image_ids)
        self.label_matrix = np.array(label_matrix, dtype=np.float32)
        self.images_dir = images_dir
        self.image_size = image_size
        self.transform = transform

    def __len__(self):
        return len(self.image_ids)

    def __getitem__(self, idx):
        image_id = self.image_ids[idx]
        labels = self.label_matrix[idx]

        path = os.path.join(self.images_dir, image_id)
        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)

        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img = clahe.apply(img)

        img = cv2.resize(img, (self.image_size, self.image_size))
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)

        if self.transform:
            augmented = self.transform(image=img)
            img = augmented["image"]

        return img, labels
