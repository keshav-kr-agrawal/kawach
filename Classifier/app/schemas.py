from pydantic import BaseModel
from typing import Literal

class ClassifyResponse(BaseModel):
    verdict: Literal["AI_GENERATED", "AUTHENTIC", "INCONCLUSIVE"]
    fake_probability: float
    confidence_level: Literal["HIGH", "MEDIUM", "LOW"]
    faces_detected: int
    frames_analyzed: int
    processing_time_ms: float
    model_count: int

class HealthResponse(BaseModel):
    status: str
    models_loaded: int
    device: str

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

