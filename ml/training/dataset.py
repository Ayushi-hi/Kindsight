"""
Dataset for the RSNA Pneumonia Detection Challenge.

Expects:
  images_dir/  containing <patientId>.dcm files
  labels_csv   with columns: patientId, x, y, width, height, Target

Note: RSNA's CSV has one row PER bounding box, so a patient with 2 pneumonia
regions appears twice. Target is identical across a patient's rows, so we
collapse to one row per patientId (max of Target) since this MVP does binary
classification only, not box localization.
"""

import os

import cv2
import numpy as np
import pandas as pd
import pydicom
from torch.utils.data import Dataset


def load_and_collapse_labels(labels_csv: str) -> pd.DataFrame:
    df = pd.read_csv(labels_csv)
    collapsed = df.groupby("patientId", as_index=False)["Target"].max()
    return collapsed


class RSNAPneumoniaDataset(Dataset):
    def __init__(self, patient_ids, labels, images_dir: str, image_size: int = 224, transform=None):
        self.patient_ids = list(patient_ids)
        self.labels = list(labels)
        self.images_dir = images_dir
        self.image_size = image_size
        self.transform = transform

    def __len__(self):
        return len(self.patient_ids)

    def _load_dicom_as_array(self, patient_id: str) -> np.ndarray:
        path = os.path.join(self.images_dir, f"{patient_id}.dcm")
        dcm = pydicom.dcmread(path)
        img = dcm.pixel_array.astype(np.float32)

        # Normalize to 0-255 range regardless of the DICOM's native bit depth
        img = img - img.min()
        max_val = img.max()
        if max_val > 0:
            img = img / max_val
        img = (img * 255).astype(np.uint8)

        # CLAHE contrast enhancement - helps a lot on chest X-rays specifically,
        # since raw DICOM contrast is often quite flat
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img = clahe.apply(img)

        img = cv2.resize(img, (self.image_size, self.image_size))
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)  # EfficientNet expects 3 channels
        return img

    def __getitem__(self, idx):
        patient_id = self.patient_ids[idx]
        label = self.labels[idx]

        image = self._load_dicom_as_array(patient_id)

        if self.transform:
            augmented = self.transform(image=image)
            image = augmented["image"]

        return image, float(label)
