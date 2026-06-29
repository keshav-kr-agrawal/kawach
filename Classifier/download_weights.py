"""
KAWACH Classifier — Model Weight Downloader
Runs at Docker build time so the container starts instantly.

Downloads:
  1. EfficientNet-B7 Deepfake ensemble (2x ~267MB) from GitHub Releases
  2. YOLO12s Road Damage model (~19MB) from HuggingFace
  3. DistilBERT Priority Classifier (~268MB) from HuggingFace
  4. TrashNet SigLIP waste classifier (~372MB) from HuggingFace
"""

import os
import urllib.request
from pathlib import Path

# ─── EfficientNet Deepfake Weights (GitHub Releases) ──────────────────────
TAG = "0.0.1"
DEEPFAKE_WEIGHT_FILES = [
    "final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36",
    "final_555_DeepFakeClassifier_tf_efficientnet_b7_ns_0_19"
]
DEEPFAKE_BASE_URL = f"https://github.com/selimsef/dfdc_deepfake_challenge/releases/download/{TAG}"

# ─── HuggingFace Model Downloads ──────────────────────────────────────────
HF_MODEL_DOWNLOADS = [
    {
        "repo_id": "rezzzq/yolo12s-road-damage-rdd2022",
        "filename": "yolo12s_RDD2022_best.pt",
        "local_path": "yolo12s_RDD2022_best.pt",  # directly in weights/
    },
    {
        "repo_id": "mrigaanksh/priority-classification-distilbert",
        "filename": "model.safetensors",
        "local_path": "priority_classifier/model.safetensors",
    },
    {
        "repo_id": "prithivMLmods/Trash-Net",
        "filename": "model.safetensors",
        "local_path": "trash_net/model.safetensors",
    },
]


def show_progress(block_num, block_size, total_size):
    if total_size > 0:
        percent = min(100, int(block_num * block_size * 100 / total_size))
        downloaded = block_num * block_size / (1024 * 1024)
        total = total_size / (1024 * 1024)
        print(f"\r  {percent}% ({downloaded:.1f} / {total:.1f} MB)", end="", flush=True)
    else:
        print(".", end="", flush=True)


def download_url(url: str, target: Path):
    """Download a file from URL to target path with progress."""
    print(f"  Downloading: {url}")
    try:
        urllib.request.urlretrieve(url, target, reporthook=show_progress)
        print(f"\n  Saved → {target}")
    except Exception as e:
        print(f"\n  FAILED: {e}")
        if target.exists():
            target.unlink()
        raise


def download_hf_file(repo_id: str, filename: str, target: Path):
    """Download a single file from a HuggingFace repo."""
    # Use the HF CDN direct URL (no authentication needed for public repos)
    url = f"https://huggingface.co/{repo_id}/resolve/main/{filename}"
    download_url(url, target)


def main():
    script_dir = Path(__file__).parent.resolve()
    weights_dir = script_dir / "weights"
    weights_dir.mkdir(exist_ok=True)

    print("\n" + "="*60)
    print("KAWACH — Downloading model weights")
    print("="*60)

    # ── 1. EfficientNet Deepfake Weights ──────────────────────────────────
    print("\n[1/3] EfficientNet-B7 Deepfake Detection Weights")
    for filename in DEEPFAKE_WEIGHT_FILES:
        target = weights_dir / filename
        if target.exists():
            print(f"  ✓ {filename} already exists, skipping.")
            continue
        url = f"{DEEPFAKE_BASE_URL}/{filename}"
        download_url(url, target)

    # ── 2. HuggingFace Model Downloads ────────────────────────────────────
    print("\n[2/3] YOLO Road Damage + Scene AI Models (HuggingFace)")
    for item in HF_MODEL_DOWNLOADS:
        target = weights_dir / item["local_path"]
        target.parent.mkdir(parents=True, exist_ok=True)

        if target.exists():
            size_mb = target.stat().st_size / (1024 * 1024)
            if size_mb > 1:  # Only skip if it's a real file (not a stub)
                print(f"  ✓ {item['local_path']} ({size_mb:.1f}MB) already exists, skipping.")
                continue

        print(f"\n  [{item['repo_id']}] → {item['filename']}")
        try:
            download_hf_file(item["repo_id"], item["filename"], target)
        except Exception as e:
            print(f"  WARNING: Could not download {item['local_path']}: {e}")
            print("  Service will run in degraded mode without this model.")

    # ── 3. Verify ─────────────────────────────────────────────────────────
    print("\n[3/3] Verifying downloaded weights...")
    all_files = list(weights_dir.rglob("*"))
    model_files = [f for f in all_files if f.is_file() and f.stat().st_size > 1_000_000]
    print(f"  Found {len(model_files)} model file(s) > 1MB")
    for f in sorted(model_files):
        size = f.stat().st_size / (1024 * 1024)
        print(f"    ✓ {f.relative_to(weights_dir)} ({size:.1f}MB)")

    print("\n✅ All downloads complete. KAWACH is ready.\n")


if __name__ == "__main__":
    main()
