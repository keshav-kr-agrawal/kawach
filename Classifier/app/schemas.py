from pydantic import BaseModel
from typing import Literal, List, Optional, Dict, Any


# ─── Pipeline 1: Deepfake Detection ────────────────────────────────────────

class ClassifyResponse(BaseModel):
    verdict: Literal["AI_GENERATED", "AUTHENTIC", "INCONCLUSIVE"]
    fake_probability: float
    confidence_level: Literal["HIGH", "MEDIUM", "LOW"]
    faces_detected: int
    frames_analyzed: int
    processing_time_ms: float
    model_count: int


# ─── Pipeline 2: Civic Department Routing ──────────────────────────────────

class RouteRequest(BaseModel):
    title: str
    description: str
    category: str


class DeptRoutingResponse(BaseModel):
    department: str
    department_name: str
    routing_reason: str
    priority: Literal["CRITICAL", "HIGH", "NORMAL", "LOW"]
    escalation_required: bool
    confidence: Literal["AI", "FALLBACK"]
    # NEW: dual-model priority consensus fields
    distilbert_priority: Optional[str] = None
    priority_upgraded: bool = False
    distilbert_confidence: float = 0.0


# ─── Pipeline 3: Scene / Visual Issue Detection ─────────────────────────────

class RawDetection(BaseModel):
    type: str              # "road_damage" or "waste"
    class_id: str
    label: str
    confidence: float
    dept_hint: Dict[str, str]


class SceneAnalysisResponse(BaseModel):
    scene_detected: bool
    scene_summary: str
    detected_issues: List[str]
    frames_sampled: int
    road_detections: int
    waste_detections: int
    suggested_dept: Optional[str] = None
    visual_priority: Optional[str] = None
    visual_severity: Optional[str] = None
    raw_detections: List[Dict[str, Any]] = []


# ─── Pipeline 4: Full Unified Analysis ────────────────────────────────────

class FullAnalysisRequest(BaseModel):
    title: str
    description: str
    category: str


class FullAnalysisResponse(BaseModel):
    # Deepfake
    verdict: Literal["AI_GENERATED", "AUTHENTIC", "INCONCLUSIVE"]
    fake_probability: float
    confidence_level: Literal["HIGH", "MEDIUM", "LOW"]
    faces_detected: int
    frames_analyzed: int
    # Routing
    department: str
    department_name: str
    routing_reason: str
    priority: Literal["CRITICAL", "HIGH", "NORMAL", "LOW"]
    escalation_required: bool
    routing_confidence: Literal["AI", "FALLBACK"]
    priority_upgraded: bool
    distilbert_confidence: float
    # Scene
    scene_detected: bool
    scene_summary: str
    detected_issues: List[str]
    road_detections: int
    waste_detections: int
    visual_priority: Optional[str] = None
    # Meta
    processing_time_ms: float
    model_count: int


# ─── Health ────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    models_loaded: int
    scene_models_loaded: int
    priority_validator_loaded: bool
    device: str
