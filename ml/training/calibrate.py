"""
Fits a single temperature scalar to calibrate the pneumonia model's
confidence scores, using the same validation split from training.

Temperature scaling (Guo et al., 2017) is the standard, simple fix for
neural network overconfidence: divide the logits by a learned scalar T
before applying sigmoid/softmax. It doesn't change which class is
predicted (T > 0 preserves ranking), only how confident the model claims
to be - which is exactly the problem being fixed here.

Usage (in Colab, after training has already produced the checkpoint):
    python calibrate.py --config configs/pneumonia_effnet_b0.yaml

Writes a small file (e.g. saved_models/efficientnet_b0_pneumonia_temperature.txt)
containing just the fitted temperature value, which the backend loads at
inference time. If this file doesn't exist, the backend falls back to
T=1.0 (uncalibrated, current behavior) - so calibration is purely additive
and never required for the app to work.
"""

import argparse
import os

import timm
import torch
import torch.nn as nn
import yaml
from sklearn.metrics import roc_auc_score

from augmentations import get_eval_transforms
from dataset import RSNAPneumoniaDataset, load_and_collapse_labels
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader


def load_config(path: str) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


def rebuild_val_loader(cfg: dict):
    """Reconstructs the exact same validation split used during training -
    same seed, same split logic - so calibration is fit on data the model
    never trained on, not accidentally on training data."""
    labels_df = load_and_collapse_labels(cfg["data"]["labels_csv"])
    patient_ids = labels_df["patientId"].values
    targets = labels_df["Target"].values

    train_ids, temp_ids, train_y, temp_y = train_test_split(
        patient_ids,
        targets,
        test_size=cfg["data"]["val_split"] + cfg["data"]["test_split"],
        stratify=targets,
        random_state=cfg["data"]["seed"],
    )
    relative_test_size = cfg["data"]["test_split"] / (cfg["data"]["val_split"] + cfg["data"]["test_split"])
    val_ids, test_ids, val_y, test_y = train_test_split(
        temp_ids, temp_y, test_size=relative_test_size, stratify=temp_y, random_state=cfg["data"]["seed"]
    )

    image_size = cfg["data"]["image_size"]
    images_dir = cfg["data"]["images_dir"]
    val_ds = RSNAPneumoniaDataset(val_ids, val_y, images_dir, image_size, get_eval_transforms(image_size))
    return DataLoader(val_ds, batch_size=cfg["training"]["batch_size"], shuffle=False, num_workers=2)


def fit_temperature(model, val_loader, device) -> float:
    model.eval()
    logits_list, labels_list = [], []

    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(device)
            logits = model(images)
            logits_list.append(logits.cpu())
            labels_list.append(labels.float().unsqueeze(1))

    all_logits = torch.cat(logits_list)
    all_labels = torch.cat(labels_list)

    # Raw (uncalibrated) AUROC for reference - temperature scaling should
    # NOT change this number, since it doesn't change prediction ranking,
    # only confidence magnitude. Printed as a sanity check.
    raw_probs = torch.sigmoid(all_logits).numpy()
    raw_auroc = roc_auc_score(all_labels.numpy(), raw_probs)
    print(f"Validation AUROC before calibration: {raw_auroc:.4f} (should stay ~same after)")

    temperature = torch.nn.Parameter(torch.ones(1) * 1.5)
    optimizer = torch.optim.LBFGS([temperature], lr=0.01, max_iter=50)
    criterion = nn.BCEWithLogitsLoss()

    def closure():
        optimizer.zero_grad()
        loss = criterion(all_logits / temperature, all_labels)
        loss.backward()
        return loss

    optimizer.step(closure)

    fitted_temp = temperature.item()
    calibrated_probs = torch.sigmoid(all_logits / fitted_temp).numpy()
    calibrated_auroc = roc_auc_score(all_labels.numpy(), calibrated_probs)
    print(f"Fitted temperature: {fitted_temp:.4f}")
    print(f"Validation AUROC after calibration: {calibrated_auroc:.4f} (confirms ranking preserved)")

    return fitted_temp


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default="configs/pneumonia_effnet_b0.yaml")
    args = parser.parse_args()

    cfg = load_config(args.config)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    checkpoint_path = os.path.join(cfg["output"]["checkpoint_dir"], cfg["output"]["checkpoint_name"])
    model = timm.create_model(cfg["model"]["architecture"], pretrained=False, num_classes=1)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device, weights_only=True))
    model.to(device)

    val_loader = rebuild_val_loader(cfg)
    temperature = fit_temperature(model, val_loader, device)

    temp_file_path = checkpoint_path.replace(".pt", "_temperature.txt")
    with open(temp_file_path, "w") as f:
        f.write(str(temperature))

    print(f"\nTemperature saved to: {temp_file_path}")
    print("Download this file alongside your model checkpoint and place it in")
    print("backend/ml_models/ - the backend will use it automatically if present.")


if __name__ == "__main__":
    main()