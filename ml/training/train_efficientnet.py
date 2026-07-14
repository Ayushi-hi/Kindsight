"""
Trains an EfficientNet-B0 binary classifier for pneumonia detection on chest X-rays.

Usage (in Colab or locally with a GPU):
    python train_efficientnet.py --config configs/pneumonia_effnet_b0.yaml

After training, copy the resulting .pt file into your backend at the path
set in backend/.env as MODEL_PATH, and set USE_MOCK_MODEL=false.
"""

import argparse
import os

import numpy as np
import pandas as pd
import timm
import torch
import torch.nn as nn
import yaml
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader
from tqdm import tqdm

from augmentations import get_eval_transforms, get_train_transforms
from dataset import RSNAPneumoniaDataset, load_and_collapse_labels


def load_config(path: str) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


def build_dataloaders(cfg: dict):
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
        temp_ids,
        temp_y,
        test_size=relative_test_size,
        stratify=temp_y,
        random_state=cfg["data"]["seed"],
    )

    print(f"Train: {len(train_ids)} | Val: {len(val_ids)} | Test: {len(test_ids)}")
    print(f"Train positive rate: {train_y.mean():.3f} | Val: {val_y.mean():.3f} | Test: {test_y.mean():.3f}")

    image_size = cfg["data"]["image_size"]
    images_dir = cfg["data"]["images_dir"]

    train_ds = RSNAPneumoniaDataset(train_ids, train_y, images_dir, image_size, get_train_transforms(image_size))
    val_ds = RSNAPneumoniaDataset(val_ids, val_y, images_dir, image_size, get_eval_transforms(image_size))
    test_ds = RSNAPneumoniaDataset(test_ids, test_y, images_dir, image_size, get_eval_transforms(image_size))

    num_workers = cfg["training"]["num_workers"]
    batch_size = cfg["training"]["batch_size"]

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)

    return train_loader, val_loader, test_loader


def build_model(cfg: dict, device):
    model = timm.create_model(
        cfg["model"]["architecture"],
        pretrained=cfg["model"]["pretrained"],
        num_classes=cfg["model"]["num_classes"],
    )
    return model.to(device)


def run_epoch(model, loader, criterion, optimizer, device, train: bool):
    model.train() if train else model.eval()
    total_loss = 0.0
    all_labels, all_probs = [], []

    context = torch.enable_grad() if train else torch.no_grad()
    with context:
        for images, labels in tqdm(loader, leave=False):
            images = images.to(device)
            labels = labels.float().unsqueeze(1).to(device)

            if train:
                optimizer.zero_grad()

            logits = model(images)
            loss = criterion(logits, labels)

            if train:
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * images.size(0)
            probs = torch.sigmoid(logits).detach().cpu().numpy()
            all_probs.extend(probs.flatten().tolist())
            all_labels.extend(labels.cpu().numpy().flatten().tolist())

    avg_loss = total_loss / len(loader.dataset)
    auroc = roc_auc_score(all_labels, all_probs)
    return avg_loss, auroc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default="configs/pneumonia_effnet_b0.yaml")
    args = parser.parse_args()

    cfg = load_config(args.config)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    train_loader, val_loader, test_loader = build_dataloaders(cfg)
    model = build_model(cfg, device)

    criterion = nn.BCEWithLogitsLoss()
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg["training"]["learning_rate"],
        weight_decay=cfg["training"]["weight_decay"],
    )

    os.makedirs(cfg["output"]["checkpoint_dir"], exist_ok=True)
    checkpoint_path = os.path.join(cfg["output"]["checkpoint_dir"], cfg["output"]["checkpoint_name"])

    best_val_auroc = 0.0
    patience_counter = 0
    log_rows = []

    for epoch in range(1, cfg["training"]["epochs"] + 1):
        train_loss, train_auroc = run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        val_loss, val_auroc = run_epoch(model, val_loader, criterion, optimizer, device, train=False)

        print(
            f"Epoch {epoch}: train_loss={train_loss:.4f} train_auroc={train_auroc:.4f} "
            f"val_loss={val_loss:.4f} val_auroc={val_auroc:.4f}"
        )
        log_rows.append(
            {"epoch": epoch, "train_loss": train_loss, "train_auroc": train_auroc, "val_loss": val_loss, "val_auroc": val_auroc}
        )

        if val_auroc > best_val_auroc:
            best_val_auroc = val_auroc
            patience_counter = 0
            torch.save(model.state_dict(), checkpoint_path)
            print(f"  -> New best val AUROC ({val_auroc:.4f}). Saved checkpoint.")
        else:
            patience_counter += 1
            if patience_counter >= cfg["training"]["early_stopping_patience"]:
                print(f"Early stopping at epoch {epoch} (no improvement for {patience_counter} epochs).")
                break

    pd.DataFrame(log_rows).to_csv(cfg["output"]["log_csv"], index=False)

    # Final evaluation on the held-out test set, using the BEST checkpoint (not
    # whatever the model looked like after the last epoch, which may be worse)
    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    test_loss, test_auroc = run_epoch(model, test_loader, criterion, optimizer, device, train=False)
    print(f"\nFinal test set AUROC: {test_auroc:.4f}")
    print(f"Best checkpoint saved to: {checkpoint_path}")


if __name__ == "__main__":
    main()
