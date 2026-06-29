"""
KAWACH Scene Analyzer — Pipeline 3
Detects civic issues directly from video frames using:
  1. YOLO12s (RDD2022) — Road damage: potholes, cracks
  2. TrashNet (SigLIP)  — Waste: garbage, plastic, trash
"""

import os
import cv2
import numpy as np
from typing import List, Dict, Any, Optional
from PIL import Image
import torch


# ──────────────────────────────────────────────────────────────────────────────
# YOLO Road Damage Detector
# ──────────────────────────────────────────────────────────────────────────────

ROAD_DAMAGE_CLASSES = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack",
    "D20": "Alligator Crack",
    "D40": "Pothole",
    "D44": "Repaired Pothole",
}

# Civic impact mapping for each YOLO class
ROAD_DAMAGE_DEPT = {
    "D00": {"dept": "CONSTRUCTION", "priority": "NORMAL", "severity": "MEDIUM"},
    "D10": {"dept": "CONSTRUCTION", "priority": "NORMAL", "severity": "MEDIUM"},
    "D20": {"dept": "CONSTRUCTION", "priority": "HIGH",   "severity": "HIGH"},
    "D40": {"dept": "CONSTRUCTION", "priority": "HIGH",   "severity": "HIGH"},
    "D44": {"dept": "CONSTRUCTION", "priority": "LOW",    "severity": "LOW"},
}

TRASH_CIVIC_MAPPING = {
    "cardboard": {"dept": "SANITATION", "priority": "LOW",    "severity": "LOW"},
    "glass":     {"dept": "SANITATION", "priority": "NORMAL", "severity": "MEDIUM"},
    "metal":     {"dept": "SANITATION", "priority": "NORMAL", "severity": "MEDIUM"},
    "paper":     {"dept": "SANITATION", "priority": "LOW",    "severity": "LOW"},
    "plastic":   {"dept": "SANITATION", "priority": "NORMAL", "severity": "MEDIUM"},
    "trash":     {"dept": "SANITATION", "priority": "HIGH",   "severity": "HIGH"},
}


class SceneAnalyzer:
    """
    Loads YOLO road damage + TrashNet models once at startup.
    Exposes analyze_video() for the /analyze-scene endpoint.
    """

    def __init__(self, weights_dir: str, device: str = "cpu"):
        self.device = device
        self.yolo_model = None
        self.trash_model = None
        self.trash_processor = None
        self._load_yolo(weights_dir)
        self._load_trash(weights_dir)

    # ── Model Loaders ────────────────────────────────────────────────────────

    def _load_yolo(self, weights_dir: str):
        yolo_path = os.path.join(weights_dir, "yolo12s_RDD2022_best.pt")
        if not os.path.exists(yolo_path):
            print(f"[SCENE] YOLO weights not found at {yolo_path} — skipping road damage detection.")
            return
        try:
            from ultralytics import YOLO
            self.yolo_model = YOLO(yolo_path)
            self.yolo_model.to(self.device)
            print(f"[SCENE] YOLO road damage model loaded from {yolo_path}")
        except Exception as e:
            print(f"[SCENE] Failed to load YOLO model: {e}")

    def _load_trash(self, weights_dir: str):
        trash_path = os.path.join(weights_dir, "trash_net")
        if not os.path.exists(trash_path):
            print(f"[SCENE] TrashNet weights not found at {trash_path} — skipping waste detection.")
            return
        try:
            from transformers import AutoImageProcessor, SiglipForImageClassification
            self.trash_processor = AutoImageProcessor.from_pretrained(trash_path)
            self.trash_model = SiglipForImageClassification.from_pretrained(trash_path)
            self.trash_model.eval()
            print(f"[SCENE] TrashNet SigLIP model loaded from {trash_path}")
        except Exception as e:
            print(f"[SCENE] Failed to load TrashNet: {e}")

    # ── Frame Extraction ─────────────────────────────────────────────────────

    def _extract_sample_frames(self, video_path: str, n_frames: int = 6) -> List[np.ndarray]:
        """Extract n evenly-spaced frames from a video as numpy BGR arrays."""
        frames = []
        cap = cv2.VideoCapture(video_path)
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0:
            cap.release()
            return frames
        indices = np.linspace(0, total - 1, min(n_frames, total), dtype=int)
        for idx in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ret, frame = cap.read()
            if ret and frame is not None:
                frames.append(frame)
        cap.release()
        return frames

    # ── YOLO Inference ───────────────────────────────────────────────────────

    def _run_yolo_on_frames(self, frames: List[np.ndarray], conf: float = 0.3) -> List[Dict]:
        if self.yolo_model is None or not frames:
            return []
        detections = []
        for frame in frames:
            try:
                results = self.yolo_model.predict(source=frame, conf=conf, verbose=False)
                for r in results:
                    for box in r.boxes:
                        cls_id = int(box.cls[0])
                        class_name = r.names[cls_id]
                        confidence = float(box.conf[0])
                        detections.append({
                            "type": "road_damage",
                            "class_id": class_name,
                            "label": ROAD_DAMAGE_CLASSES.get(class_name, class_name),
                            "confidence": round(confidence, 3),
                            "dept_hint": ROAD_DAMAGE_DEPT.get(class_name, {
                                "dept": "CONSTRUCTION", "priority": "NORMAL", "severity": "MEDIUM"
                            })
                        })
            except Exception as e:
                print(f"[SCENE] YOLO inference error: {e}")
        return detections

    # ── TrashNet Inference ───────────────────────────────────────────────────

    def _run_trash_on_frames(self, frames: List[np.ndarray], threshold: float = 0.60) -> List[Dict]:
        if self.trash_model is None or self.trash_processor is None or not frames:
            return []
        detections = []
        label_map = {0: "cardboard", 1: "glass", 2: "metal", 3: "paper", 4: "plastic", 5: "trash"}
        for frame in frames:
            try:
                pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                inputs = self.trash_processor(images=pil_img, return_tensors="pt")
                with torch.no_grad():
                    outputs = self.trash_model(**inputs)
                    probs = torch.nn.functional.softmax(outputs.logits, dim=1)[0].tolist()
                top_idx = int(np.argmax(probs))
                top_conf = float(probs[top_idx])
                if top_conf >= threshold:
                    label = label_map[top_idx]
                    detections.append({
                        "type": "waste",
                        "class_id": label,
                        "label": f"{label.capitalize()} waste detected",
                        "confidence": round(top_conf, 3),
                        "dept_hint": TRASH_CIVIC_MAPPING.get(label, {
                            "dept": "SANITATION", "priority": "NORMAL", "severity": "MEDIUM"
                        })
                    })
            except Exception as e:
                print(f"[SCENE] TrashNet inference error: {e}")
        return detections

    # ── Public API ───────────────────────────────────────────────────────────

    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """
        Main entry: extract frames → run YOLO + TrashNet → aggregate results.
        Returns a structured scene analysis dict.
        """
        frames = self._extract_sample_frames(video_path, n_frames=6)
        if not frames:
            return self._empty_result("Could not extract frames from video.")

        road_detections = self._run_yolo_on_frames(frames, conf=0.30)
        waste_detections = self._run_trash_on_frames(frames, threshold=0.60)
        all_detections = road_detections + waste_detections

        # Aggregate: highest priority dept from all detections
        top_dept = "GENERAL"
        top_priority = "NORMAL"
        top_severity = "LOW"
        detected_issues = []

        priority_rank = {"CRITICAL": 4, "HIGH": 3, "NORMAL": 2, "LOW": 1}
        severity_rank = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

        for det in all_detections:
            hint = det.get("dept_hint", {})
            det_priority = hint.get("priority", "NORMAL")
            det_severity = hint.get("severity", "LOW")
            det_dept = hint.get("dept", "GENERAL")

            if priority_rank.get(det_priority, 0) > priority_rank.get(top_priority, 0):
                top_priority = det_priority
                top_dept = det_dept
            if severity_rank.get(det_severity, 0) > severity_rank.get(top_severity, 0):
                top_severity = det_severity

            label_entry = f"{det['label']} ({det['confidence']*100:.0f}%)"
            if label_entry not in detected_issues:
                detected_issues.append(label_entry)

        has_detections = len(all_detections) > 0
        scene_summary = (
            f"Detected {len(road_detections)} road damage instance(s) and "
            f"{len(waste_detections)} waste instance(s) in video frames."
            if has_detections else
            "No specific civic issues detected visually in the sampled frames."
        )

        return {
            "scene_detected": has_detections,
            "scene_summary": scene_summary,
            "detected_issues": detected_issues,
            "frames_sampled": len(frames),
            "road_detections": len(road_detections),
            "waste_detections": len(waste_detections),
            "suggested_dept": top_dept,
            "visual_priority": top_priority,
            "visual_severity": top_severity,
            "raw_detections": all_detections,
        }

    def analyze_frame_bytes(self, frame_bytes: bytes) -> Dict[str, Any]:
        """Analyze a single JPEG/PNG frame provided as raw bytes."""
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return self._empty_result("Could not decode frame bytes.")
        road = self._run_yolo_on_frames([frame])
        waste = self._run_trash_on_frames([frame])
        all_det = road + waste
        return {
            "scene_detected": len(all_det) > 0,
            "road_detections": len(road),
            "waste_detections": len(waste),
            "raw_detections": all_det,
        }

    @staticmethod
    def _empty_result(reason: str) -> Dict[str, Any]:
        return {
            "scene_detected": False,
            "scene_summary": reason,
            "detected_issues": [],
            "frames_sampled": 0,
            "road_detections": 0,
            "waste_detections": 0,
            "suggested_dept": None,
            "visual_priority": None,
            "visual_severity": None,
            "raw_detections": [],
        }
