import os
import re
from pathlib import Path
from functools import partial
import torch
from torch import nn
from torch.nn.modules.dropout import Dropout
from torch.nn.modules.linear import Linear
from torch.nn.modules.pooling import AdaptiveAvgPool2d
from timm.models.efficientnet import tf_efficientnet_b7_ns

encoder_params = {
    "tf_efficientnet_b7_ns": {
        "features": 2560,
        "init_op": partial(tf_efficientnet_b7_ns, pretrained=False, drop_path_rate=0.2)
    }
}

class DeepFakeClassifier(nn.Module):
    def __init__(self, encoder="tf_efficientnet_b7_ns", dropout_rate=0.0) -> None:
        super().__init__()
        self.encoder = encoder_params[encoder]["init_op"]()
        self.avg_pool = AdaptiveAvgPool2d((1, 1))
        self.dropout = Dropout(dropout_rate)
        self.fc = Linear(encoder_params[encoder]["features"], 1)

    def forward(self, x):
        x = self.encoder.forward_features(x)
        x = self.avg_pool(x).flatten(1)
        x = self.dropout(x)
        x = self.fc(x)
        return x

def load_models(weights_dir: str, device: str) -> list:
    """Loads all .pth files from weights/ directory."""
    models = []
    weights_path = Path(weights_dir)
    if not weights_path.exists():
        print(f"Weights directory {weights_dir} does not exist.")
        return models

    # Check for weight files matching 'final_*'
    weight_files = sorted(list(weights_path.glob("final_*")))
    if not weight_files:
        print(f"No checkpoint files starting with 'final_' found in {weights_dir}")
        # Look for general .pth or .pt files if final_ is not found
        weight_files = sorted(list(weights_path.glob("*.pth"))) + sorted(list(weights_path.glob("*.pt")))

    for weight_file in weight_files:
        print(f"Loading weights from {weight_file}")
        model = DeepFakeClassifier(encoder="tf_efficientnet_b7_ns").to(device)
        try:
            try:
                checkpoint = torch.load(weight_file, map_location="cpu", weights_only=False)
            except TypeError:
                checkpoint = torch.load(weight_file, map_location="cpu")
            state_dict = checkpoint.get("state_dict", checkpoint)
            # Strip "module." prefix if model was trained with DataParallel
            clean_state_dict = {re.sub("^module.", "", k): v for k, v in state_dict.items()}
            model.load_state_dict(clean_state_dict, strict=True)
            model.eval()
            if device == "cuda":
                models.append(model.half()) # FP16 for speed on GPU
            else:
                models.append(model.float()) # FP32 for CPU compatibility
            print(f"Successfully loaded checkpoint {weight_file.name}")
        except Exception as e:
            print(f"Error loading checkpoint {weight_file.name}: {e}")
    return models
