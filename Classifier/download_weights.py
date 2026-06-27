import os
import urllib.request
from pathlib import Path

# URLs of the checkpoints on GitHub Releases
TAG = "0.0.1"
WEIGHT_FILES = [
    "final_111_DeepFakeClassifier_tf_efficientnet_b7_ns_0_36",
    "final_555_DeepFakeClassifier_tf_efficientnet_b7_ns_0_19"
]
BASE_URL = f"https://github.com/selimsef/dfdc_deepfake_challenge/releases/download/{TAG}"

def show_progress(block_num, block_size, total_size):
    """Print download progress bar."""
    if total_size > 0:
        percent = min(100, int(block_num * block_size * 100 / total_size))
        downloaded = block_num * block_size / (1024 * 1024)
        total = total_size / (1024 * 1024)
        print(f"\rDownloading: {percent}% ({downloaded:.1f}MB of {total:.1f}MB)", end="", flush=True)
    else:
        print(".", end="", flush=True)

def main():
    # Target directory relative to this script
    script_dir = Path(__file__).parent.resolve()
    weights_dir = script_dir / "weights"
    weights_dir.mkdir(exist_ok=True)

    print(f"Checking checkpoints in: {weights_dir}")

    for filename in WEIGHT_FILES:
        target_path = weights_dir / filename
        if target_path.exists():
            print(f" - {filename} already exists, skipping.")
            continue

        download_url = f"{BASE_URL}/{filename}"
        print(f" - Downloading {filename} from {download_url}...")
        try:
            # Download with progress callback
            urllib.request.urlretrieve(download_url, target_path, reporthook=show_progress)
            print("\nDownload complete.")
        except Exception as e:
            print(f"\nFailed to download {filename}: {e}")
            if target_path.exists():
                try:
                    target_path.unlink()
                except Exception:
                    pass

if __name__ == "__main__":
    main()
