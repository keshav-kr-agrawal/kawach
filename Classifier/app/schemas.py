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
    trust_score: float = 0.0
    civic_urgency_score: float = 0.0


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
    # Dual-model priority consensus
    distilbert_priority: Optional[str] = None
    priority_upgraded: bool = False
    distilbert_confidence: float = 0.0
    # Enhanced routing metadata
    sub_category: Optional[str] = None
    estimated_resolution_days: Optional[int] = None
    trust_score: float = 0.0
    civic_urgency_score: float = 0.0


# ─── Pipeline 3: Scene / Visual Issue Detection ─────────────────────────────

class RawDetection(BaseModel):
    type: str              # "road_damage" or "waste"
    class_id: str
    label: str
    confidence: float
    coverage_pct: float = 0.0
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
    temporal_consistency: float = 0.0
    dominant_class: Optional[str] = None
    top_detection_confidence: float = 0.0
    raw_detections: List[Dict[str, Any]] = []
    trust_score: float = 0.0
    civic_urgency_score: float = 0.0


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
    sub_category: Optional[str] = None
    estimated_resolution_days: Optional[int] = None
    # Scene
    scene_detected: bool
    scene_summary: str
    detected_issues: List[str]
    road_detections: int
    waste_detections: int
    visual_priority: Optional[str] = None
    visual_severity: Optional[str] = None
    temporal_consistency: float = 0.0
    dominant_class: Optional[str] = None
    top_detection_confidence: float = 0.0
    # Composite scores
    trust_score: float = 0.0
    civic_urgency_score: float = 0.0
    # Meta
    processing_time_ms: float
    model_count: int


# ─── Pipeline 5: Predictive Hotspot Analysis ──────────────────────────────

class ReportSummary(BaseModel):
    category: str = "General"
    department: str = "SANITATION"
    priority: str = "NORMAL"
    routing_reason: str = ""
    scene_summary: str = ""


class HotspotRequest(BaseModel):
    lat: float
    lng: float
    radius_km: float = 2.0
    recent_reports: List[ReportSummary] = []


class HotspotResponse(BaseModel):
    hotspot_likelihood: Literal["HIGH", "MEDIUM", "LOW"]
    risk_score: float
    dominant_category: str
    predicted_next_issue: str
    analysis: str
    recommended_action: str
    report_count: int
    confidence: Literal["AI", "STATISTICAL"]


# ─── Pipeline 6: Quick Image Validate ─────────────────────────────────────

class QuickValidateResponse(BaseModel):
    scene_detected: bool
    detected_issues: List[str]
    road_detections: int
    waste_detections: int
    suggested_dept: Optional[str] = None
    visual_priority: Optional[str] = None
    processing_time_ms: float
    trust_score: float = 0.0


# ─── Health ────────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    models_loaded: int
    scene_models_loaded: int
    priority_validator_loaded: bool
    device: str
    pipelines_active: int = 0
    version: str = "2.1.0"
    # Real-vs-mock transparency: if deepfake weights failed to load, /classify
    # and /full-analysis return mock results — this must be visible, not silent.
    deepfake_mode: str = "unknown"  # "real" | "mock_fallback"
    routing_mode: str = "unknown"   # "gemini" | "keyword_fallback"
    gemini_model: str = ""
