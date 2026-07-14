"""
Trains a multi-label EfficientNet-B0 classifier across the 14 NIH
ChestX-ray14 conditions.

Usage:
    python train_multilabel.py --config configs/chestxray14_effnet_b0.yaml

Reports per-class AUROC honestly - some rare conditions (e.g. Hernia) will
likely score much worse than common ones (e.g. Infiltration, Effusion) given
the class imbalance in this dataset. This is expected and should be stated
plainly in any writeup, not averaged away.
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
from dataset_multilabel import CONDITIONS, ChestXray14Dataset, load_labels


def load_config(path: str) -> dict:
    with open(path, "r") as f:
        return yaml.safe_load(f)


def build_dataloaders(cfg: dict):
    labels_df = load_labels(cfg["data"]["labels_csv"])
    image_ids = labels_df["Image Index"].values
    label_matrix = labels_df[CONDITIONS].values

    train_ids, temp_ids, train_y, temp_y = train_test_split(
        image_ids,
        label_matrix,
        test_size=cfg["data"]["val_split"] + cfg["data"]["test_split"],
        random_state=cfg["data"]["seed"],
    )
    relative_test_size = cfg["data"]["test_split"] / (cfg["data"]["val_split"] + cfg["data"]["test_split"])
    val_ids, test_ids, val_y, test_y = train_test_split(
        temp_ids, temp_y, test_size=relative_test_size, random_state=cfg["data"]["seed"]
    )

    print(f"Train: {len(train_ids)} | Val: {len(val_ids)} | Test: {len(test_ids)}")
    print("Positive rate per condition (train set):")
    for i, condition in enumerate(CONDITIONS):
        print(f"  {condition}: {train_y[:, i].mean():.3f}")

    image_size = cfg["data"]["image_size"]
    images_dir = cfg["data"]["images_dir"]

    train_ds = ChestXray14Dataset(train_ids, train_y, images_dir, image_size, get_train_transforms(image_size))
    val_ds = ChestXray14Dataset(val_ids, val_y, images_dir, image_size, get_eval_transforms(image_size))
    test_ds = ChestXray14Dataset(test_ids, test_y, images_dir, image_size, get_eval_transforms(image_size))

    batch_size = cfg["training"]["batch_size"]
    num_workers = cfg["training"]["num_workers"]

    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=num_workers)
    val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False, num_workers=num_workers)

    return train_loader, val_loader, test_loader, train_y


def compute_pos_weight(train_y: np.ndarray) -> torch.Tensor:
    """Handles class imbalance - rare conditions get a higher weight in the
    loss so the model isn't just biased toward always predicting negative."""
    pos_counts = train_y.sum(axis=0)
    neg_counts = len(train_y) - pos_counts
    # Avoid division by zero for any condition with zero positive examples
    # in this particular split (possible with rare conditions like Hernia)
    pos_counts = np.clip(pos_counts, 1, None)
    weights = neg_counts / pos_counts
    return torch.tensor(weights, dtype=torch.float32)


def build_model(cfg: dict, device):
    model = timm.create_model(
        cfg["model"]["architecture"],
        pretrained=cfg["model"]["pretrained"],
        num_classes=len(CONDITIONS),
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
            labels = labels.to(device)

            if train:
                optimizer.zero_grad()

            logits = model(images)
            loss = criterion(logits, labels)

            if train:
                loss.backward()
                optimizer.step()

            total_loss += loss.item() * images.size(0)
            probs = torch.sigmoid(logits).detach().cpu().numpy()
            all_probs.append(probs)
            all_labels.append(labels.cpu().numpy())

    avg_loss = total_loss / len(loader.dataset)
    all_probs = np.concatenate(all_probs, axis=0)
    all_labels = np.concatenate(all_labels, axis=0)

    # Per-class AUROC - skip any class with only one label value present
    # (can happen with rare conditions in a small validation split), report
    # as None for that class rather than crashing or silently faking a number
    per_class_auroc = {}
    for i, condition in enumerate(CONDITIONS):
        if len(np.unique(all_labels[:, i])) < 2:
            per_class_auroc[condition] = None
        else:
            per_class_auroc[condition] = roc_auc_score(all_labels[:, i], all_probs[:, i])

    valid_scores = [v for v in per_class_auroc.values() if v is not None]
    macro_auroc = float(np.mean(valid_scores)) if valid_scores else 0.0

    return avg_loss, macro_auroc, per_class_auroc


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=str, default="configs/chestxray14_effnet_b0.yaml")
    args = parser.parse_args()

    cfg = load_config(args.config)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    train_loader, val_loader, test_loader, train_y = build_dataloaders(cfg)
    model = build_model(cfg, device)

    pos_weight = compute_pos_weight(train_y).to(device)
    criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=cfg["training"]["learning_rate"],
        weight_decay=cfg["training"]["weight_decay"],
    )

    os.makedirs(cfg["output"]["checkpoint_dir"], exist_ok=True)
    checkpoint_path = os.path.join(cfg["output"]["checkpoint_dir"], cfg["output"]["checkpoint_name"])

    best_val_macro_auroc = 0.0
    patience_counter = 0
    log_rows = []

    for epoch in range(1, cfg["training"]["epochs"] + 1):
        train_loss, train_macro_auroc, _ = run_epoch(model, train_loader, criterion, optimizer, device, train=True)
        val_loss, val_macro_auroc, val_per_class = run_epoch(model, val_loader, criterion, optimizer, device, train=False)

        print(
            f"Epoch {epoch}: train_loss={train_loss:.4f} train_macro_auroc={train_macro_auroc:.4f} "
            f"val_loss={val_loss:.4f} val_macro_auroc={val_macro_auroc:.4f}"
        )
        log_rows.append(
            {
                "epoch": epoch,
                "train_loss": train_loss,
                "train_macro_auroc": train_macro_auroc,
                "val_loss": val_loss,
                "val_macro_auroc": val_macro_auroc,
            }
        )

        if val_macro_auroc > best_val_macro_auroc:
            best_val_macro_auroc = val_macro_auroc
            patience_counter = 0
            torch.save(model.state_dict(), checkpoint_path)
            print(f"  -> New best val macro AUROC ({val_macro_auroc:.4f}). Saved checkpoint.")
        else:
            patience_counter += 1
            if patience_counter >= cfg["training"]["early_stopping_patience"]:
                print(f"Early stopping at epoch {epoch}.")
                break

    pd.DataFrame(log_rows).to_csv(cfg["output"]["log_csv"], index=False)

    model.load_state_dict(torch.load(checkpoint_path, map_location=device))
    test_loss, test_macro_auroc, test_per_class = run_epoch(model, test_loader, criterion, optimizer, device, train=False)

    print(f"\nFinal test set macro AUROC: {test_macro_auroc:.4f}")
    print("Per-class test AUROC (report these honestly, don't just quote the macro number):")
    for condition, score in test_per_class.items():
        score_str = f"{score:.4f}" if score is not None else "N/A (insufficient positive examples in test split)"
        print(f"  {condition}: {score_str}")

    print(f"\nBest checkpoint saved to: {checkpoint_path}")


if __name__ == "__main__":
    main()
