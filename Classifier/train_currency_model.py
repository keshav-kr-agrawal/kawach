"""
KAWACH — Counterfeit Currency CNN trainer & evaluator.

Transfer-learning of MobileNetV3-small (ImageNet) on a labeled real/fake INR
note dataset. Small model on purpose: must serve on free-tier CPU.

Dataset layout (ImageFolder — put your Kaggle download here):

    Classifier/datasets/currency/
        train/
            real/   *.jpg|png  (genuine notes, any denomination)
            fake/   *.jpg|png
        val/            # optional — auto-split 20% from train if absent
            real/
            fake/

Recommended sources (see plan/kawach_master_plan.md Phase 4):
  - kaggle.com/datasets/sreeharisureshkaggle/fake-currency-detection-dataset (Rs500+Rs2000)
  - kaggle.com/datasets/iayushanand/currency-dataset500-inr-note-real-fake
  - kaggle.com/datasets/preetrank/indian-currency-real-vs-fake-notes-dataset

Per-denomination evaluation: if filenames or parent dirs contain a
denomination token (100/200/500/2000), metrics are additionally reported per
denomination — accuracy claims in the deck must be per-denomination, not one
blended number.

Usage:
    python train_currency_model.py                 # train + eval + save weights
    python train_currency_model.py --eval-only     # eval existing weights only
"""

import argparse
import json
import os
import random
import re
import sys
from datetime import datetime, timezone

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.currency_detector import build_currency_model, CURRENCY_CLASSES

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "datasets", "currency")
WEIGHTS_OUT = os.path.join(BASE_DIR, "weights", "currency", "currency_cnn.pt")
REPORT_OUT = os.path.join(BASE_DIR, "weights", "currency", "eval_report.json")

SEED = 42
INPUT_SIZE = 224
BATCH_SIZE = 16
EPOCHS = 8
LR = 3e-4

DENOM_RE = re.compile(r"(?<!\d)(2000|500|200|100|50|20|10)(?!\d)")


def _seed_everything():
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)


def _transforms(train: bool):
    aug = [
        transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
    ]
    if train:
        aug += [
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.25, contrast=0.2, saturation=0.15),
            transforms.RandomRotation(8),
        ]
    aug += [
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]
    return transforms.Compose(aug)


def _load_datasets():
    train_dir = os.path.join(DATA_DIR, "train")
    val_dir = os.path.join(DATA_DIR, "val")
    if not os.path.isdir(train_dir):
        sys.exit(
            f"Dataset not found at {train_dir}.\n"
            f"Download a real/fake INR dataset (see header) and arrange as "
            f"datasets/currency/train/{{real,fake}}/*.jpg"
        )

    full_train = datasets.ImageFolder(train_dir, transform=_transforms(train=True))
    if sorted(full_train.classes) != sorted(CURRENCY_CLASSES):
        sys.exit(f"Expected class dirs {CURRENCY_CLASSES}, found {full_train.classes}")

    if os.path.isdir(val_dir):
        val_ds = datasets.ImageFolder(val_dir, transform=_transforms(train=False))
        train_ds = full_train
    else:
        n_val = max(1, int(0.2 * len(full_train)))
        train_ds, val_split = random_split(
            full_train, [len(full_train) - n_val, n_val],
            generator=torch.Generator().manual_seed(SEED),
        )
        # Re-wrap val subset with eval transforms
        val_base = datasets.ImageFolder(train_dir, transform=_transforms(train=False))
        val_ds = torch.utils.data.Subset(val_base, val_split.indices)
    return train_ds, val_ds


def _denomination_of(path: str):
    m = DENOM_RE.search(os.path.basename(path)) or DENOM_RE.search(os.path.dirname(path))
    return m.group(1) if m else "unknown"


def evaluate(model, val_ds, device):
    """Overall + per-denomination accuracy/precision/recall on the val set."""
    model.eval()
    base = val_ds.dataset if isinstance(val_ds, torch.utils.data.Subset) else val_ds
    indices = val_ds.indices if isinstance(val_ds, torch.utils.data.Subset) else range(len(val_ds))
    loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False)

    preds, labels = [], []
    with torch.no_grad():
        for x, y in loader:
            out = model(x.to(device))
            preds.extend(out.argmax(1).cpu().tolist())
            labels.extend(y.tolist())

    paths = [base.samples[i][0] for i in indices]
    fake_idx = CURRENCY_CLASSES.index("fake")

    def metrics(sel):
        n = len(sel)
        if n == 0:
            return None
        correct = sum(1 for i in sel if preds[i] == labels[i])
        tp = sum(1 for i in sel if preds[i] == fake_idx and labels[i] == fake_idx)
        fp = sum(1 for i in sel if preds[i] == fake_idx and labels[i] != fake_idx)
        fn = sum(1 for i in sel if preds[i] != fake_idx and labels[i] == fake_idx)
        return {
            "n": n,
            "accuracy": round(correct / n, 4),
            "fake_precision": round(tp / (tp + fp), 4) if tp + fp else None,
            "fake_recall": round(tp / (tp + fn), 4) if tp + fn else None,
        }

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "val_samples": len(paths),
        "overall": metrics(list(range(len(paths)))),
        "per_denomination": {},
    }
    denoms = {}
    for i, p in enumerate(paths):
        denoms.setdefault(_denomination_of(p), []).append(i)
    for denom, sel in sorted(denoms.items()):
        report["per_denomination"][denom] = metrics(sel)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--eval-only", action="store_true")
    parser.add_argument("--epochs", type=int, default=EPOCHS)
    parser.add_argument("--arch", default="efficientnet_b0",
                        choices=["efficientnet_b0", "mobilenet_v3_small", "mobilenet_v3_large"],
                        help="For best accuracy, prefer kaggle_train_currency.ipynb on a GPU instead "
                             "of this CPU-only script — it trains the same architectures with much "
                             "stronger augmentation, class balancing, and a proper held-out test set.")
    args = parser.parse_args()

    _seed_everything()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device} | Arch: {args.arch}")
    if device == "cpu":
        print("NOTE: no GPU detected. For serious training, use kaggle_train_currency.ipynb on "
              "Colab's free T4 GPU instead — this script is a quick local sanity-check path.")

    train_ds, val_ds = _load_datasets()
    print(f"Train: {len(train_ds)} images | Val: {len(val_ds)} images")

    if args.eval_only:
        if not os.path.exists(WEIGHTS_OUT):
            sys.exit(f"No weights at {WEIGHTS_OUT} — train first.")
        ckpt = torch.load(WEIGHTS_OUT, map_location=device, weights_only=False)
        arch = ckpt.get("arch", args.arch) if isinstance(ckpt, dict) else args.arch
        state = ckpt["state_dict"] if isinstance(ckpt, dict) else ckpt
        model = build_currency_model(arch)
        model.load_state_dict(state)
        model.to(device)
    else:
        model = build_currency_model(args.arch, pretrained=True)
        model.to(device)

        loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True)
        optimizer = torch.optim.AdamW(model.parameters(), lr=LR)
        criterion = nn.CrossEntropyLoss()

        for epoch in range(args.epochs):
            model.train()
            total, correct, loss_sum = 0, 0, 0.0
            for x, y in loader:
                x, y = x.to(device), y.to(device)
                optimizer.zero_grad()
                out = model(x)
                loss = criterion(out, y)
                loss.backward()
                optimizer.step()
                loss_sum += loss.item() * len(y)
                correct += (out.argmax(1) == y).sum().item()
                total += len(y)
            print(f"Epoch {epoch + 1}/{args.epochs} — loss {loss_sum / total:.4f}, train acc {correct / total:.3f}")

        os.makedirs(os.path.dirname(WEIGHTS_OUT), exist_ok=True)
        torch.save({
            "arch": args.arch,
            "classes": CURRENCY_CLASSES,
            "state_dict": model.state_dict(),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "trainer": "train_currency_model.py (local quick-train)",
        }, WEIGHTS_OUT)
        print(f"Saved weights -> {WEIGHTS_OUT}")

    report = evaluate(model, val_ds, device)
    os.makedirs(os.path.dirname(REPORT_OUT), exist_ok=True)
    with open(REPORT_OUT, "w") as f:
        json.dump(report, f, indent=2)
    print(json.dumps(report, indent=2))
    print(f"\nEval report saved -> {REPORT_OUT}")
    print("Deck rule: quote per-denomination accuracy, never one blended number.")


if __name__ == "__main__":
    main()
