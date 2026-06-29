"""
KAWACH Scene Analyzer — Pipeline 3  (v2.1)
Detects civic issues directly from video frames using:
  1. YOLO12s (RDD2022) — Road damage: potholes, cracks, alligator cracks
  2. TrashNet (SigLIP)  — Waste: garbage, plastic, trash categories

New in v2.1:
  • Temporal consistency: fraction of sampled frames with detections
    (>= 0.5 = persistent issue, not an isolated artefact)
  • Bounding box coverage: detected area as % of frame size
  • Dominant class: most frequently detected issue class
  • top_detection_confidence: peak model confidence across all frames
  • Actionable scene summaries for department dispatch
"""

import os
import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from PIL import Image
import torch


# ── Class Maps ────────────────────────────────────────────────────────────────

ROAD_DAMAGE_CLASSES = {
    "D00": "Longitudinal Crack",
    "D10": "Transverse Crack",
    "D20": "Alligator Crack",
    "D40": "Pothole",
    "D44": "Repaired Pothole",
}

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

TRASH_LABEL_MAP = {0: "cardboard", 1: "glass", 2: "metal", 3: "paper", 4: "plastic", 5: "trash"}

_PRIORITY_RANK = {"CRITICAL": 4, "HIGH": 3, "NORMAL": 2, "LOW": 1}
_SEVERITY_RANK = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}


class SceneAnalyzer:
    """
    Loads YOLO road damage + TrashNet models once at startup.
    Exposes analyze_video() for the /analyze-scene and /full-analysis endpoints.
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

    def _extract_sample_frames(self, video_path: str, n_frames: int = 8) -> List[np.ndarray]:
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

    def _run_yolo_on_frame(self, frame: np.ndarray, conf: float = 0.30) -> List[Dict]:
        """Run YOLO on a single frame, returning detections with bbox coverage."""
        if self.yolo_model is None:
            return []
        detections = []
        frame_h, frame_w = frame.shape[:2]
        frame_area = frame_h * frame_w or 1
        try:
            results = self.yolo_model.predict(source=frame, conf=conf, verbose=False)
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    class_name = r.names[cls_id]
                    confidence = float(box.conf[0])
                    # Compute bbox coverage as % of frame area
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    bbox_area = max(0, (x2 - x1) * (y2 - y1))
                    coverage_pct = round((bbox_area / frame_area) * 100, 2)
                    detections.append({
                        "type": "road_damage",
                        "class_id": class_name,
                        "label": ROAD_DAMAGE_CLASSES.get(class_name, class_name),
                        "confidence": round(confidence, 3),
                        "coverage_pct": coverage_pct,
                        "dept_hint": ROAD_DAMAGE_DEPT.get(class_name, {
                            "dept": "CONSTRUCTION", "priority": "NORMAL", "severity": "MEDIUM"
                        }),
                    })
        except Exception as e:
            print(f"[SCENE] YOLO inference error: {e}")
        return detections

    def _run_yolo_on_frames(self, frames: List[np.ndarray], conf: float = 0.30) -> List[Dict]:
        return [det for f in frames for det in self._run_yolo_on_frame(f, conf)]

    # ── TrashNet Inference ───────────────────────────────────────────────────

    def _run_trash_on_frame(self, frame: np.ndarray, threshold: float = 0.60) -> List[Dict]:
        """Run TrashNet on a single frame."""
        if self.trash_model is None or self.trash_processor is None:
            return []
        detections = []
        try:
            pil_img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            inputs = self.trash_processor(images=pil_img, return_tensors="pt")
            with torch.no_grad():
                outputs = self.trash_model(**inputs)
                probs = torch.nn.functional.softmax(outputs.logits, dim=1)[0].tolist()
            top_idx = int(np.argmax(probs))
            top_conf = float(probs[top_idx])
            if top_conf >= threshold:
                label = TRASH_LABEL_MAP[top_idx]
                detections.append({
                    "type": "waste",
                    "class_id": label,
                    "label": f"{label.capitalize()} waste detected",
                    "confidence": round(top_conf, 3),
                    "coverage_pct": 0.0,  # classifier has no bbox
                    "dept_hint": TRASH_CIVIC_MAPPING.get(label, {
                        "dept": "SANITATION", "priority": "NORMAL", "severity": "MEDIUM"
                    }),
                })
        except Exception as e:
            print(f"[SCENE] TrashNet inference error: {e}")
        return detections

    def _run_trash_on_frames(self, frames: List[np.ndarray], threshold: float = 0.60) -> List[Dict]:
        return [det for f in frames for det in self._run_trash_on_frame(f, threshold)]

    # ── Aggregate Helpers ────────────────────────────────────────────────────

    @staticmethod
    def _aggregate(
        all_detections: List[Dict],
        n_frames: int,
        frames_with_hits: int,
    ) -> Dict[str, Any]:
        """Build aggregated stats from a flat list of detections."""
        top_dept = "GENERAL"
        top_priority = "NORMAL"
        top_severity = "LOW"
        top_conf = 0.0
        detected_issues = []
        class_counts: Dict[str, int] = {}

        for det in all_detections:
            hint = det.get("dept_hint", {})
            det_priority = hint.get("priority", "NORMAL")
            det_severity = hint.get("severity", "LOW")
            det_dept = hint.get("dept", "GENERAL")
            det_conf = det.get("confidence", 0.0)

            if _PRIORITY_RANK.get(det_priority, 0) > _PRIORITY_RANK.get(top_priority, 0):
                top_priority = det_priority
                top_dept = det_dept
            if _SEVERITY_RANK.get(det_severity, 0) > _SEVERITY_RANK.get(top_severity, 0):
                top_severity = det_severity
            if det_conf > top_conf:
                top_conf = det_conf

            class_counts[det["class_id"]] = class_counts.get(det["class_id"], 0) + 1

            label_entry = f"{det['label']} ({det_conf * 100:.0f}%)"
            if label_entry not in detected_issues:
                detected_issues.append(label_entry)

        temporal_consistency = round(frames_with_hits / max(n_frames, 1), 3)
        dominant_class = max(class_counts, key=class_counts.get) if class_counts else None

        return {
            "top_dept": top_dept,
            "top_priority": top_priority,
            "top_severity": top_severity,
            "top_conf": round(top_conf, 3),
            "detected_issues": detected_issues,
            "temporal_consistency": temporal_consistency,
            "dominant_class": dominant_class,
        }

    @staticmethod
    def _build_summary(
        road_count: int,
        waste_count: int,
        temporal_consistency: float,
        dominant_class: Optional[str],
        top_priority: str,
    ) -> str:
        if road_count == 0 and waste_count == 0:
            return "No specific civic issues detected visually in the sampled frames."

        parts = []
        if road_count:
            parts.append(f"{road_count} road damage instance(s)")
        if waste_count:
            parts.append(f"{waste_count} waste/garbage instance(s)")

        summary = f"Detected {' and '.join(parts)} in video frames."

        if dominant_class:
            label = ROAD_DAMAGE_CLASSES.get(dominant_class, dominant_class.capitalize())
            summary += f" Dominant issue: {label}."

        if temporal_consistency >= 0.5:
            summary += (
                " Issue persists across multiple frames — consistent physical problem requiring prompt attention."
            )
        elif temporal_consistency > 0:
            summary += " Issue visible in isolated frames."

        if top_priority in ("CRITICAL", "HIGH"):
            summary += " Recommend immediate escalation to the relevant department."

        return summary

    # ── Public API ───────────────────────────────────────────────────────────

    def analyze_video(self, video_path: str) -> Dict[str, Any]:
        """
        Main entry: extract frames → run YOLO + TrashNet per frame
        → aggregate with temporal consistency tracking.
        """
        frames = self._extract_sample_frames(video_path, n_frames=8)
        if not frames:
            return self._empty_result("Could not extract frames from video.")

        all_road: List[Dict] = []
        all_waste: List[Dict] = []
        frames_with_hits = 0

        for frame in frames:
            frame_road = self._run_yolo_on_frame(frame)
            frame_waste = self._run_trash_on_frame(frame)
            if frame_road or frame_waste:
                frames_with_hits += 1
            all_road.extend(frame_road)
            all_waste.extend(frame_waste)

        all_detections = all_road + all_waste
        agg = self._aggregate(all_detections, len(frames), frames_with_hits)

        summary = self._build_summary(
            len(all_road), len(all_waste),
            agg["temporal_consistency"],
            agg["dominant_class"],
            agg["top_priority"],
        )

        return {
            "scene_detected": len(all_detections) > 0,
            "scene_summary": summary,
            "detected_issues": agg["detected_issues"],
            "frames_sampled": len(frames),
            "road_detections": len(all_road),
            "waste_detections": len(all_waste),
            "suggested_dept": agg["top_dept"],
            "visual_priority": agg["top_priority"],
            "visual_severity": agg["top_severity"],
            "temporal_consistency": agg["temporal_consistency"],
            "dominant_class": agg["dominant_class"],
            "top_detection_confidence": agg["top_conf"],
            "raw_detections": all_detections,
        }

    def analyze_frame_bytes(self, frame_bytes: bytes) -> Dict[str, Any]:
        """Analyze a single JPEG/PNG frame provided as raw bytes."""
        nparr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            return self._empty_result("Could not decode frame bytes.")
        road = self._run_yolo_on_frame(frame)
        waste = self._run_trash_on_frame(frame)
        all_det = road + waste
        agg = self._aggregate(all_det, 1, 1 if all_det else 0)
        return {
            "scene_detected": len(all_det) > 0,
            "road_detections": len(road),
            "waste_detections": len(waste),
            "top_detection_confidence": agg["top_conf"],
            "visual_priority": agg["top_priority"],
            "suggested_dept": agg["top_dept"],
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
            "temporal_consistency": 0.0,
            "dominant_class": None,
            "top_detection_confidence": 0.0,
            "raw_detections": [],
        }
