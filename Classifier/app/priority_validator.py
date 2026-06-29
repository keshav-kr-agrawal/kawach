"""
KAWACH Priority Validator — DistilBERT civic issue priority cross-checker.
Loads mrigaanksh/priority-classification-distilbert locally for offline inference.
Used as a second opinion on top of Gemini's priority assignment.
"""

import os
from typing import Dict, Any

LABEL_MAP = {0: "LOW", 1: "MEDIUM", 2: "HIGH"}
PRIORITY_UPGRADE = {"LOW": "NORMAL", "MEDIUM": "HIGH", "HIGH": "CRITICAL"}


class PriorityValidator:
    """
    Validates / upgrades the routing priority using a DistilBERT model
    trained specifically on civic issue descriptions.
    """

    def __init__(self, model_dir: str):
        self.model = None
        self.tokenizer = None
        self._load(model_dir)

    def _load(self, model_dir: str):
        priority_path = os.path.join(model_dir, "priority_classifier")
        if not os.path.exists(priority_path):
            print(f"[PRIORITY] DistilBERT model not found at {priority_path} — validator disabled.")
            return
        try:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            self.tokenizer = AutoTokenizer.from_pretrained(priority_path)
            self.model = AutoModelForSequenceClassification.from_pretrained(priority_path)
            self.model.eval()
            print(f"[PRIORITY] DistilBERT priority validator loaded from {priority_path}")
        except Exception as e:
            print(f"[PRIORITY] Failed to load DistilBERT: {e}")

    def validate(self, title: str, description: str, gemini_priority: str) -> Dict[str, Any]:
        """
        Runs DistilBERT on the report text. Compares with Gemini's priority.
        If DistilBERT rates it HIGHER, it upgrades the final priority.

        Returns:
            {
                "final_priority":  str,   # Final resolved priority
                "distilbert_priority": str,
                "gemini_priority": str,
                "upgraded": bool,         # True if DistilBERT upgraded it
                "distilbert_confidence": float
            }
        """
        if self.model is None or self.tokenizer is None:
            # Validator not loaded — pass through Gemini priority unchanged
            return {
                "final_priority": gemini_priority,
                "distilbert_priority": None,
                "gemini_priority": gemini_priority,
                "upgraded": False,
                "distilbert_confidence": 0.0,
            }

        import torch
        import torch.nn.functional as F

        text = f"{title}. {description}"
        try:
            inputs = self.tokenizer(
                text, return_tensors="pt", truncation=True,
                padding=True, max_length=128
            )
            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = F.softmax(outputs.logits, dim=-1)[0].tolist()

            bert_idx = int(probs.index(max(probs)))
            bert_label_raw = LABEL_MAP[bert_idx]          # LOW / MEDIUM / HIGH
            bert_conf = float(max(probs))

            # Map DistilBERT labels → our routing system labels
            bert_priority_map = {"LOW": "LOW", "MEDIUM": "NORMAL", "HIGH": "HIGH"}
            bert_priority = bert_priority_map.get(bert_label_raw, "NORMAL")

            # Priority rank for comparison
            rank = {"LOW": 1, "NORMAL": 2, "HIGH": 3, "CRITICAL": 4}
            upgraded = rank.get(bert_priority, 0) > rank.get(gemini_priority, 0)
            final_priority = bert_priority if upgraded else gemini_priority

            return {
                "final_priority": final_priority,
                "distilbert_priority": bert_priority,
                "gemini_priority": gemini_priority,
                "upgraded": upgraded,
                "distilbert_confidence": round(bert_conf, 3),
            }

        except Exception as e:
            print(f"[PRIORITY] DistilBERT inference failed: {e}")
            return {
                "final_priority": gemini_priority,
                "distilbert_priority": None,
                "gemini_priority": gemini_priority,
                "upgraded": False,
                "distilbert_confidence": 0.0,
            }
